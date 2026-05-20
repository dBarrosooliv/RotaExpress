import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authApi,
  productsApi,
  recommendationsApi,
  popularApi,
  categoryApi,
  cartApi,
} from "@/services/api";
import type {
  CartItem,
  Product,
  Recommendation,
  UserSession,
} from "@/services/mockData";

export function useStorefront() {
  // MongoDB: catálogo
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // MongoDB: populares (+200 compras)
  const [popular, setPopular] = useState<Recommendation[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);

  // Neo4j: "outros também compraram" (por usuário)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  // Neo4j + MongoDB: por categoria (ativado ao clicar num produto)
  const [categoryRecs, setCategoryRecs] = useState<Recommendation[]>([]);
  const [categoryRecsLoading, setCategoryRecsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // PostgreSQL: sessão + carrinho
  const [session, setSession] = useState<UserSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Restaura sessão ao recarregar a página
  useEffect(() => {
    const stored = localStorage.getItem("polyglot_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem("polyglot_session");
      }
    }
  }, []);

  // Carrega catálogo (MongoDB) e populares — sempre, independente de login
  useEffect(() => {
    productsApi.list().then((data) => {
      setProducts(data);
      setProductsLoading(false);
    });

    popularApi.list().then((data) => {
      setPopular(data);
      setPopularLoading(false);
    });
  }, []);

  // Carrega recomendações "outros também compraram" (Neo4j) — só se logado
  useEffect(() => {
    if (session?.userId) {
      setRecommendationsLoading(true);
      recommendationsApi.forUser(session.userId).then((data) => {
        setRecommendations(data);
        setRecommendationsLoading(false);
      });
    } else {
      setRecommendations([]);
      setRecommendationsLoading(false);
    }
  }, [session?.userId]);

  // Carrega recomendações por categoria quando um produto é selecionado
  const loadCategoryRecs = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setCategoryRecsLoading(true);
    categoryApi.forProduct(productId).then((data) => {
      setCategoryRecs(data);
      setCategoryRecsLoading(false);
    });
  }, []);

  const productLookup = useMemo(
    () => Object.fromEntries(products.map((p) => [p._id, p])),
    [products],
  );

  const login = useCallback(async (email: string, password: string) => {
    const next = await authApi.login(email, password);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    localStorage.removeItem("polyglot_session");
    setSession(null);
    setCart([]);
  }, []);

  const addToCart = useCallback((product: Product) => {
    if ((product.stock ?? 1) === 0) {
      alert("Este produto está esgotado no momento.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { productId: product._id, quantity: 1, unitPrice: product.price }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const checkout = useCallback(async () => {
    if (!session?.userId) {
      alert("Por favor, faça login para finalizar a compra!");
      return;
    }
    try {
      await cartApi.checkout(session.userId, cart);
      setCart([]);
      alert("Compra realizada com sucesso! 🎉");
    } catch (error) {
      console.error("Erro no checkout:", error);
      alert("Ocorreu um erro ao processar sua compra.");
    }
  }, [session, cart]);

  return {
    // Catálogo
    products,
    productsLoading,
    // Populares
    popular,
    popularLoading,
    // Outros também compraram
    recommendations,
    recommendationsLoading,
    // Por categoria
    categoryRecs,
    categoryRecsLoading,
    selectedProductId,
    loadCategoryRecs,
    // Sessão e carrinho
    session,
    cart,
    cartCount,
    productLookup,
    checkout,
    login,
    logout,
    addToCart,
    removeFromCart,
  };
}
