import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authApi,
  productsApi,
  recommendationsApi,
  cartApi,
} from "@/services/api";
import type {
  CartItem,
  Product,
  Recommendation,
  UserSession,
} from "@/services/mockData";

/**
 * Single hook orchestrating data from all three databases.
 * In production this becomes three independent React Query hooks
 * (`useProducts`, `useRecommendations`, `useSession`) — the split
 * between data sources stays the same.
 */
export function useStorefront() {
  // MongoDB: product catalog
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Neo4j: recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  // PostgreSQL: session + cart
  const [session, setSession] = useState<UserSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // 1. SEU EFFECT ATUAL: Mantém o usuário logado ao dar F5
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

    // 2. NOVO EFFECT: Carrega a vitrine (Mongo) e as Recomendações (Neo4j)
    useEffect(() => {
      // Busca o catálogo geral do MongoDB (roda sempre)
      productsApi.list().then((data) => {
        setProducts(data);
        setProductsLoading(false);
      });

      // Se o seu effect de cima achar um usuário logado, este aqui roda e busca no Neo4j!
      if (session?.userId) {
        setRecommendationsLoading(true);
        recommendationsApi.forUser(session.userId).then((data) => {
          setRecommendations(data);
          setRecommendationsLoading(false);
        });
      } else {
        // Se não tiver ninguém logado, limpa a aba de recomendados
        setRecommendations([]);
        setRecommendationsLoading(false);
      }
    }, [session?.userId]); // Fica de olho no ID do usuário. Se mudar (Login/Logout), ele atualiza os dados.

  useEffect(() => {
    // Fire both reads in parallel — they hit different services.
    productsApi.list().then((data) => {
      setProducts(data);
      setProductsLoading(false);
    });
    recommendationsApi.forUser("u_42").then((data) => {
      setRecommendations(data);
      setRecommendationsLoading(false);
    });
  }, []);

  const productLookup = useMemo(
    () => Object.fromEntries(products.map((p) => [p._id, p])),
    [products],
  );

  const login = useCallback(async () => {
    // PostgreSQL transaction
    const next = await authApi.login("alex@example.com", "demo");
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    localStorage.removeItem("polyglot_session");
    setSession(null);
    setCart([]);
  }, []);

  const addToCart = useCallback((product: Product) => {
    // Validar se o produto está esgotado
    if ((product.stock ?? 1) === 0) {
      alert("Este produto está esgotado no momento.");
      return;
    }

    // Optimistic update — backend would persist this in Postgres.
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { productId: product._id, quantity: 1, unitPrice: product.price },
      ];
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
      // Chama a API que criamos na etapa anterior
      await cartApi.checkout(session.userId, cart);
      
      // Se deu sucesso, esvazia o carrinho na tela
      setCart([]);
      alert("Compra realizada com sucesso! 🎉");
    } catch (error) {
      console.error("Erro no checkout:", error);
      alert("Ocorreu um erro ao processar sua compra.");
    }
  }, [session, cart]);

  return {
    products,
    productsLoading,
    recommendations,
    recommendationsLoading,
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
