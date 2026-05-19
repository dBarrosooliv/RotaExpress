import { ShoppingCart, User, Sparkles, LogIn, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { GlassCard } from "./GlassCard";
import type { UserSession } from "@/services/mockData";

interface HeaderProps {
  cartCount: number;
  session: UserSession | null;
  onLogout: () => void;
  onOpenCart: () => void;
}

/**
 * Top navigation bar. The cart counter and session indicator
 * are conceptually backed by PostgreSQL (transactional state).
 */
export function Header({
  cartCount,
  session,
  onLogout,
  onOpenCart,
}: HeaderProps) {
  return (
    <header className="sticky top-4 z-30 mx-auto w-full max-w-7xl px-4">
      <GlassCard className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">RotaExpress</span>
              <span className="text-[11px] text-muted-foreground">
                Marketplace poliglota
              </span>
            </div>
          </div>
          {session && (
            <span className="ml-11 text-xs font-medium text-primary">
              Bem vindo, {session.name}!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCart}
            className="relative inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-foreground transition hover:bg-white/15"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-1.5 text-[10px] font-semibold text-primary-foreground shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {session ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm sm:flex">
                <User className="h-4 w-4" />
                <span>{session.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm transition hover:bg-white/15"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-gradient-to-r from-primary/80 to-accent/80 px-3 py-2 text-sm font-medium text-primary-foreground transition hover:from-primary hover:to-accent"
            >
              <LogIn className="h-4 w-4" />
              Fazer login
            </Link>
          )}
        </div>
      </GlassCard>
    </header>
  );
}
