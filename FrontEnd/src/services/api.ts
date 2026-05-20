/**
 * API service layer — mirrors the polyglot backend split.
 *
 *   productsApi          -> MongoDB   (catálogo)
 *   recommendationsApi   -> Neo4j     (outros também compraram)
 *   popularApi           -> MongoDB   (popularidade +200 compras)
 *   categoryApi          -> Neo4j + MongoDB (por categoria)
 *   authApi / cartApi    -> PostgreSQL (transacional, ACID)
 */

import {
  MOCK_PRODUCTS,
  MOCK_RECOMMENDATIONS,
  type CartItem,
  type Product,
  type Recommendation,
  type UserSession,
} from "./mockData";

const delay = <T>(value: T, ms = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/* -------------------------------------------------------------------------- */
/* MongoDB — catálogo de produtos                                               */
/* -------------------------------------------------------------------------- */
export const productsApi = {
  async list(): Promise<Product[]> {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      if (!response.ok) throw new Error('Falha ao buscar produtos da API');
      const data = await response.json();
      return data.map((item: any) => ({
        ...item,
        id: item._id.toString(),
        attributes: item.attributes || {},
        description: item.description || "Descrição em breve...",
        price: item.price || 0,
        image: item.image || "https://via.placeholder.com/300",
        rating: item.rating || 5,
        stock: item.stock !== undefined ? item.stock : 1,
      }));
    } catch (error) {
      console.error("Erro ao conectar com o Backend (MongoDB):", error);
      return delay(MOCK_PRODUCTS);
    }
  },

  async getById(id: string): Promise<Product | undefined> {
    return delay(MOCK_PRODUCTS.find((p) => p._id === id));
  },
};

/* -------------------------------------------------------------------------- */
/* MongoDB — popularidade (+200 compras)                                       */
/* GET /api/popular                                                            */
/* -------------------------------------------------------------------------- */
export const popularApi = {
  async list(): Promise<Recommendation[]> {
    try {
      const response = await fetch('http://localhost:3000/api/popular');
      if (!response.ok) throw new Error('Falha ao buscar populares');
      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar populares, usando fallback:", error);
      return delay(MOCK_RECOMMENDATIONS, 500);
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Neo4j — "outros também compraram" (gosto similar)                           */
/* GET /api/recommendations/:userId                                            */
/* -------------------------------------------------------------------------- */
export const recommendationsApi = {
  async forUser(userId: string): Promise<Recommendation[]> {
    try {
      const response = await fetch(`http://localhost:3000/api/recommendations/${userId}`);
      if (!response.ok) throw new Error('Falha ao buscar recomendações');
      return await response.json();
    } catch (error) {
      console.error("Erro nas recomendações, usando fallback local:", error);
      return delay(MOCK_RECOMMENDATIONS, 500);
    }
  },

  async similarTo(productId: string): Promise<Recommendation[]> {
    return delay(MOCK_RECOMMENDATIONS.filter((r) => r.relatedTo === productId));
  },
};

/* -------------------------------------------------------------------------- */
/* Neo4j + MongoDB — recomendação por categoria                                */
/* GET /api/category-recommendations/:productId                               */
/* -------------------------------------------------------------------------- */
export const categoryApi = {
  async forProduct(productId: string): Promise<Recommendation[]> {
    try {
      const response = await fetch(`http://localhost:3000/api/category-recommendations/${productId}`);
      if (!response.ok) throw new Error('Falha ao buscar por categoria');
      return await response.json();
    } catch (error) {
      console.error("Erro nas recomendações por categoria:", error);
      return [];
    }
  },
};

/* -------------------------------------------------------------------------- */
/* PostgreSQL — auth, sessão, carrinho, checkout (ACID)                        */
/* -------------------------------------------------------------------------- */
export const authApi = {
  async login(email: string, password: string): Promise<UserSession> {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao fazer login');
      }
      const data = await response.json();
      const user = data.session.user;
      const profile = data.profile;
      const userSession = {
        userId: user.id,
        name: profile.full_name || "Usuário Sem Nome",
        email: user.email,
        loggedInAt: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      };
      localStorage.setItem("polyglot_session", JSON.stringify(userSession));
      return userSession;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },

  async register(name: string, email: string, password: string): Promise<void> {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: name }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao criar conta');
    }
  },
};

export const cartApi = {
  async get(): Promise<CartItem[]> {
    return delay([]);
  },

  async add(item: CartItem): Promise<CartItem> {
    return delay(item);
  },

  async checkout(userId: string, cart: CartItem[]): Promise<void> {
    const response = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, cart }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao processar o checkout');
    }
  },
};
