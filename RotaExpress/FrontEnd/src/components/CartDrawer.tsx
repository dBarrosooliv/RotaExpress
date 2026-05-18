import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { CartItem, Product } from "@/services/mockData";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  productLookup: Record<string, Product>;
  onRemove: (productId: string) => void;
  // Nova propriedade que receberemos do pai:
  onCheckout: () => Promise<void>; 
}

export function CartDrawer({
  open,
  onClose,
  items,
  productLookup,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  // Estado para controlar se está processando a compra
  const [isProcessing, setIsProcessing] = useState(false);

  if (!open) return null;

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleCheckout = async () => {
    setIsProcessing(true);
    await onCheckout();
    setIsProcessing(false);
    onClose(); // Fecha a gaveta após o sucesso
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard
        className="m-3 flex h-[calc(100%-1.5rem)] w-full max-w-md flex-col p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Seu carrinho</h2>
            <p className="text-xs text-muted-foreground">
              Estado transacional · PostgreSQL
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-glass-border bg-glass p-2 transition hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-glass-border p-8 text-center text-sm text-muted-foreground">
              Seu carrinho está vazio.
            </div>
          )}
          {items.map((item) => {
            const product = productLookup[item.productId];
            if (!product) return null;
            return (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-xl border border-glass-border bg-glass p-3"
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">{product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Qtd {item.quantity} · ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.productId)}
                  className="rounded-full border border-glass-border bg-glass p-2 transition hover:bg-destructive/30"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-glass-border pt-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-semibold">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={items.length === 0 || isProcessing}
            className="w-full rounded-xl border border-glass-border bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition disabled:opacity-40"
          >
            {isProcessing ? "Processando..." : "Finalizar compra"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}