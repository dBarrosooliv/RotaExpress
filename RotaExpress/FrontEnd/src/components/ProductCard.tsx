import { Sparkles, ShoppingBag } from "lucide-react";
import type { Product } from "@/services/mockData";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  /** Optional reason to surface (used in the Neo4j recommendation grid). */
  recommendationReason?: string;
  onAddToCart?: (product: Product) => void;
}

/**
 * Reusable product card. Renders the dynamic `attributes` map directly,
 * which is what makes the catalog work with MongoDB's flexible schema —
 * different products can have different keys and the UI adapts.
 */
export function ProductCard({
  product,
  recommendationReason,
  onAddToCart,
}: ProductCardProps) {
  // attributes is `Record<string, unknown-ish>`. Render whatever is there.
  const attrEntries = Object.entries(product.attributes || {}); // Adicionamos o || {} para garantir que sempre seja um objeto, mesmo se vier undefined

  return (
    <GlassCard className="glass-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {recommendationReason && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-[oklch(0.7_0.18_150/40%)] bg-[oklch(0.3_0.18_150/55%)] px-2.5 py-1 text-[11px] font-medium text-[oklch(0.95_0.1_150)] backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Recomendado
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full border border-glass-border bg-glass px-2 py-1 text-[11px] text-foreground/90 backdrop-blur-md">
          {product.category}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {product.title}
          </h3>
          <span className="shrink-0 text-base font-semibold text-foreground"> 
            ${(product.price || 0).toFixed(2)} 
          </span>
        </div>

        {recommendationReason && (
          <p className="text-xs italic text-muted-foreground">
            “{recommendationReason}”
          </p>
        )}

        {/* Dynamic attributes — MongoDB documents can vary per product. */}
        <ul className="flex flex-wrap gap-1.5">
          {attrEntries.slice(0, 4).map(([key, value]) => (
            <li
              key={key}
              className={cn(
                "rounded-full border border-glass-border bg-glass px-2 py-0.5 text-[11px]",
                "text-muted-foreground",
              )}
            >
              <span className="text-foreground/80">{key}</span>
              <span className="px-1 opacity-50">·</span>
              <span>{String(value)}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onAddToCart?.(product)}
          disabled={(product.stock ?? 1) === 0}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-glass-border bg-gradient-to-r from-primary/80 to-accent/80 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:from-primary hover:to-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:from-primary/40 disabled:to-accent/40"
        >
          <ShoppingBag className="h-4 w-4" />
          {(product.stock ?? 1) === 0 ? "Esgotado" : "Adicionar ao carrinho"}
        </button>
      </div>
    </GlassCard>
  );
}
