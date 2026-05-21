import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useStorefront } from "@/hooks/useStorefront";
import { GlassCard } from "@/components/GlassCard";
import { SourceBadge } from "@/components/SourceBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RotaExpress" },
      {
        name: "description",
        content:
          "Vitrine de comércio eletrônico com glassmorphismo, movida por PostgreSQL, MongoDB e recomendações do Neo4j.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const {
    products,
    productsLoading,
    recommendations,
    recommendationsLoading,
    session,
    cart,
    cartCount,
    productLookup,
    logout,
    addToCart,
    removeFromCart,
    checkout,
  } = useStorefront();

  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen pb-24">
      <Header
        cartCount={cartCount}
        session={session}
        onLogout={logout}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="mx-auto mt-10 max-w-7xl space-y-16 px-4">
        {/* Hero / architecture intro */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <GlassCard className="p-8 sm:p-10">
            <div className="mb-3 flex flex-wrap gap-2">
              <SourceBadge source="postgres" />
              <SourceBadge source="mongo" />
              <SourceBadge source="neo4j" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              O Marketplace dirigido pela{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                comunidade
              </span>
              .
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Sessões e checkout permanecem seguro no PostgreSQL, o catálogo flui de documentos MongoDB, e suas escolhas personalizadas vêm direto de um grafo de recomendação do Neo4j.
            </p>
          </GlassCard>

          <GlassCard className="p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-semibold">Políglota em um relance</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <SourceBadge source="postgres" />
                <span className="text-muted-foreground">
                  Transações ACID para autenticação, carrinho e pedidos.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <SourceBadge source="mongo" />
                <span className="text-muted-foreground">
                  Documentos de produtos flexíveis, cada item pode levar seus próprios atributos.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <SourceBadge source="neo4j" />
                <span className="text-muted-foreground">
                  Travessias de grafo apontam sugestões de "compras similares" em tempo real.
                </span>
              </li>
            </ul>
          </GlassCard>
        </section>

        {/* Recommendations (Neo4j) — TOP of the page as required. */}
        <section>
          <SectionHeader
            source="neo4j"
            title="Recomendado para você"
            description="Movido por relacionamentos de grafo entre usuários e produtos."
          />
          {recommendationsLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recommendations.map((rec) => (
                <ProductCard
                  key={rec.product._id}
                  product={rec.product}
                  recommendationReason={rec.reason}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>

        {/* Catalog (MongoDB) */}
        <section>
          <SectionHeader
            source="mongo"
            title="Todos os produtos"
            description="O catálogo completo — documentos heterogêneos renderizados dinamicamente."
          />
          {productsLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        productLookup={productLookup}
        onRemove={removeFromCart}
        onCheckout={checkout} 
      />
    </div>
  );
}
