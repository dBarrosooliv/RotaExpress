import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { SourceBadge } from "@/components/SourceBadge";
import { authApi } from "@/services/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Fazer login — RotaExpress" },
      {
        name: "description",
        content: "Faça login em sua conta RotaExpress.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("alex@exemplo.com");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Backed by PostgreSQL in the real system — see services/api.ts
      await authApi.login(email, password);
      navigate({ to: "/" });
    } catch {
      setError("Não foi possível fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlassCard className="w-full max-w-md p-8 sm:p-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-foreground">Rota Express</span>
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <SourceBadge source="postgres" />
          <span className="text-[11px] text-muted-foreground">
            Sessão transacional
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Bem-vindo de volta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faça login para sincronizar seu carrinho e recomendações pessoais.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field
            id="email"
            label="E-mail"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@exemplo.com"
            autoComplete="email"
          />
          <Field
            id="password"
            label="Senha"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-glass-border bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Fazendo login…" : "Fazer login"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link to="/register" className="font-medium text-foreground hover:underline">
            Cadastre-se
          </Link>
        </p>

      </GlassCard>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2.5 transition focus-within:border-primary/60 focus-within:bg-white/15">
        <span className="text-muted-foreground">{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
