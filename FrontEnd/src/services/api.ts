/**
 * API service layer — mirrors the polyglot backend split.
 *
 * Each function is a placeholder for a real `fetch` / `axios` call.
 * Replace the body with a real HTTP request when wiring up the backend;
 * the response *shape* will already match what the components consume.
 *
 *   productsApi       -> MongoDB   (catalog, flexible documents)
 *   recommendationsApi-> Neo4j     (graph traversal)
 *   authApi / cartApi -> PostgreSQL (transactional, ACID)
 */

import {
  MOCK_PRODUCTS,
  MOCK_RECOMMENDATIONS,
  MOCK_SESSION,
  type CartItem,
  type Product,
  type Recommendation,
  type UserSession,
} from "./mockData";


// 

// Tiny helper so the mock feels like a real network call.
const delay = <T>(value: T, ms = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/* -------------------------------------------------------------------------- */
/* MongoDB — product catalog                                                   */
/* -------------------------------------------------------------------------- */
export const productsApi = {
  /**
   * GET /api/products
   * Backend reads from the `products` collection in MongoDB.
   * Documents are heterogeneous — each product can have its own `attributes`.
   */
async list(): Promise<Product[]> {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar produtos da API');
      }
      
      const data = await response.json();
      
      // Mapeia o _id do MongoDB para id (caso o frontend do Lovable espere "id" em vez de "_id")
      return data.map((item: any) => ({
        ...item,
        id: item._id.toString(), // Converte o _id do Mongo para o id que o React usa
        
        // Se o banco não enviar esses dados, mandamos um padrão vazio para não quebrar a tela:
        attributes: item.attributes || {}, 
        description: item.description || "Descrição em breve...",
        price: item.price || 0,
        image: item.image || "https://via.placeholder.com/300",
        rating: item.rating || 5,
        stock: item.stock !== undefined ? item.stock : 1, // Padrão para 1 se não enviar
      }));

    } catch (error) {
      console.error("Erro ao conectar com o Backend (MongoDB):", error);
      // Plano B: Se o seu backend estiver desligado, ele volta a mostrar os dados falsos para não quebrar a tela
      return delay(MOCK_PRODUCTS); 
    }
  },

  /**
   * GET /api/products/:id
   * Single document lookup by `_id` in MongoDB.
   */
  async getById(id: string): Promise<Product | undefined> {
    return delay(MOCK_PRODUCTS.find((p) => p._id === id));
  },
};

/* -------------------------------------------------------------------------- */
/* Neo4j — recommendation engine                                               */
/* -------------------------------------------------------------------------- */
export const recommendationsApi = {
  /**
   * GET /api/recommendations/:userId
   */
  async forUser(userId: string): Promise<Recommendation[]> {
    try {
      const response = await fetch(`http://localhost:3000/api/recommendations/${userId}`);
      if (!response.ok) throw new Error('Falha ao buscar recomendações');
      return await response.json();
    } catch (error) {
      console.error("Erro nas recomendações, usando fallback local:", error);
      return delay(MOCK_RECOMMENDATIONS, 500); // Mantemos o mock como plano B caso o backend caia
    }
  },

  async similarTo(productId: string): Promise<Recommendation[]> {
    return delay(
      MOCK_RECOMMENDATIONS.filter((r) => r.relatedTo === productId),
    );
  },
};

/* -------------------------------------------------------------------------- */
/* PostgreSQL — auth, session, cart, checkout (ACID)                           */
/* -------------------------------------------------------------------------- */
export const authApi = {
  /**
   * POST /api/auth/login
   * Agora bate no nosso Backend Node.js que por sua vez valida no Supabase!
   */
  async login(email: string, password: string): Promise<UserSession> {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao fazer login');
      }

      const data = await response.json();
      const user = data.session.user;
      const profile = data.profile;

      // 1. Primeiro montamos o objeto com os dados do usuário
      const userSession = {
        userId: user.id,
        name: profile.full_name || "Usuário Sem Nome",
        email: user.email,
        loggedInAt: new Date().toISOString(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      };

      // 2. ADICIONE AQUI: Salvamos esse objeto na memória do navegador antes de retornar!
      localStorage.setItem("polyglot_session", JSON.stringify(userSession));

      // 3. Retornamos o objeto que acabamos de salvar
      return userSession;

    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    // Como estamos usando JWT, o logout por enquanto é só limpar a sessão no Frontend
    return Promise.resolve();
  },

  /**
   * POST /api/auth/register
   * Cria um novo usuário no Supabase via Backend Node.js
   */
  async register(name: string, email: string, password: string): Promise<void> {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Passamos fullName: name para casar exatamente com o que o Node.js espera!
      body: JSON.stringify({ email, password, fullName: name }) 
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao criar conta');
    }
  },
};

export const cartApi = {
  /**
   * GET /api/cart
   * Reads cart_items joined with products — strict relational integrity.
   */
  async get(): Promise<CartItem[]> {
    return delay([]);
  },

  /**
   * POST /api/cart/items
   * Inserts a row inside a transaction so price + stock stay consistent.
   */
  async add(item: CartItem): Promise<CartItem> {
    return delay(item);
  },

  /**
   * POST /api/checkout
   * Envia o carrinho para o PostgreSQL gravar a transação financeira.
   */
  async checkout(userId: string, cart: CartItem[]): Promise<void> {
    const response = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, cart }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao processar o checkout');
    }
  },
};
