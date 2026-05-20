import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Trash2,
  LogOut,
  Package,
  Minus,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — RotaExpress" }],
  }),
  component: AdminPage,
});

interface Product {
  _id: string;
  title: string;
  price: number;
  image: string;
  category?: string;
  stock?: number;
}

type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string; }

const API_BASE = "http://localhost:3000";

function AdminPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});

  // Guard: redirect if not authenticated as admin
  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") !== "true") {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error();
      const data: any[] = await res.json();
      setProducts(data.map((p) => ({ ...p, _id: (p._id ?? p.id)?.toString() })));
    } catch {
      addToast("error", "Falha ao carregar produtos do servidor.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (productId: string, title: string) => {
    if (!confirm(`Deletar "${title}"? Esta ação é irreversível.`)) return;
    setDeletingId(productId);
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      addToast("success", `"${title}" removido com sucesso.`);
    } catch {
      addToast("error", `Falha ao deletar "${title}".`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStock = async (product: Product) => {
    const newStock = stockEdits[product._id];
    if (newStock === undefined) return;
    setUpdatingId(product._id);
    try {
      const res = await fetch(`${API_BASE}/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });
      if (!res.ok) throw new Error();
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, stock: newStock } : p))
      );
      setStockEdits((prev) => { const n = { ...prev }; delete n[product._id]; return n; });
      addToast("success", `Estoque de "${product.title}" atualizado para ${newStock}.`);
    } catch {
      addToast("error", `Falha ao atualizar estoque de "${product.title}".`);
    } finally {
      setUpdatingId(null);
    }
  };

  const currentStock = (p: Product) =>
    stockEdits[p._id] !== undefined ? stockEdits[p._id] : (p.stock ?? 0);

  const changeStock = (p: Product, delta: number) => {
    const next = Math.max(0, currentStock(p) + delta);
    setStockEdits((prev) => ({ ...prev, [p._id]: next }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    navigate({ to: "/" });
  };

  return (
    <div className="admin-root">
      <div className="bg-grid" />

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <div className="brand-icon"><Shield size={18} /></div>
            <div>
              <span className="brand-name">Painel Admin</span>
              <span className="brand-sub">RotaExpress</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="stats-pill">
              <Package size={13} />
              <span>{products.length} produtos</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="page-title-row">
          <h1 className="page-title">Gerenciar Produtos</h1>
          <p className="page-sub">Delete itens do catálogo ou ajuste o estoque em tempo real.</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin-icon" />
            <span>Carregando catálogo...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={40} />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => {
              const stock = currentStock(product);
              const isDirty = stockEdits[product._id] !== undefined && stockEdits[product._id] !== product.stock;
              const isDeleting = deletingId === product._id;
              const isUpdating = updatingId === product._id;

              return (
                <div key={product._id} className={`product-card ${isDeleting ? "card-deleting" : ""}`}>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(product._id, product.title)}
                    disabled={isDeleting || isUpdating}
                    title="Deletar produto"
                  >
                    {isDeleting
                      ? <Loader2 size={15} className="spin-icon" />
                      : <Trash2 size={15} />}
                  </button>

                  <div className="card-img-wrap">
                    <img
                      src={product.image || "https://via.placeholder.com/300"}
                      alt={product.title}
                      className="card-img"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/300"; }}
                    />
                    {stock === 0 && <span className="out-badge">Esgotado</span>}
                  </div>

                  <div className="card-body">
                    {product.category && <span className="card-category">{product.category}</span>}
                    <h3 className="card-title">{product.title}</h3>
                    <p className="card-price">
                      {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>

                    <div className="stock-section">
                      <span className="stock-label">Estoque</span>
                      <div className="stock-control">
                        <button className="stock-btn" onClick={() => changeStock(product, -1)} disabled={stock <= 0 || isUpdating}>
                          <Minus size={12} />
                        </button>
                        <span className={`stock-value ${stock === 0 ? "zero" : ""}`}>{stock}</span>
                        <button className="stock-btn" onClick={() => changeStock(product, 1)} disabled={isUpdating}>
                          <Plus size={12} />
                        </button>
                      </div>
                      {isDirty && (
                        <button className="save-btn" onClick={() => handleUpdateStock(product)} disabled={isUpdating}>
                          {isUpdating ? <Loader2 size={12} className="spin-icon" /> : "Salvar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .admin-root {
          min-height: 100vh;
          background: #0a0a0f;
          font-family: 'DM Mono', 'Courier New', monospace;
          color: #e4e4e7;
          position: relative;
        }

        .bg-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none; z-index: 0;
        }

        .topbar {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10,10,15,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .topbar-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
          height: 60px; display: flex; align-items: center; justify-content: space-between;
        }
        .topbar-brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon {
          width: 36px; height: 36px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          color: #ef4444;
        }
        .brand-name { display: block; font-size: 14px; font-weight: 700; color: #f4f4f5; line-height: 1.2; }
        .brand-sub { display: block; font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.08em; }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .stats-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 5px 12px; font-size: 12px; color: rgba(255,255,255,0.5);
        }
        .logout-btn {
          display: flex; align-items: center; gap: 6px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          color: #f87171; border-radius: 8px; padding: 6px 14px;
          font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
          transition: background 0.2s;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.2); }

        .main-content {
          position: relative; z-index: 1;
          max-width: 1280px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem;
        }
        .page-title-row { margin-bottom: 2rem; }
        .page-title { font-size: 1.75rem; font-weight: 700; color: #f4f4f5; letter-spacing: -0.02em; }
        .page-sub { font-size: 13px; color: rgba(255,255,255,0.35); margin-top: 4px; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 5rem; color: rgba(255,255,255,0.3); font-size: 14px;
        }
        .spin-icon { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .product-card {
          position: relative;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; overflow: hidden;
          transition: border-color 0.2s, transform 0.2s, opacity 0.3s;
        }
        .product-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .card-deleting { opacity: 0.4; pointer-events: none; }

        .delete-btn {
          position: absolute; top: 10px; right: 10px; z-index: 10;
          width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
          background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px; color: #f87171; cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .delete-btn:hover:not(:disabled) { background: rgba(239,68,68,0.35); transform: scale(1.08); }
        .delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .card-img-wrap {
          position: relative; width: 100%; padding-top: 65%; overflow: hidden;
          background: rgba(255,255,255,0.04);
        }
        .card-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: contain; padding: 12px; transition: transform 0.3s;
        }
        .product-card:hover .card-img { transform: scale(1.04); }
        .out-badge {
          position: absolute; bottom: 8px; left: 8px;
          background: rgba(239,68,68,0.9); color: white;
          font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.06em;
        }

        .card-body { padding: 14px 16px 16px; }
        .card-category {
          display: inline-block; font-size: 10px; color: rgba(255,255,255,0.3);
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;
        }
        .card-title { font-size: 14px; font-weight: 600; color: #f4f4f5; line-height: 1.3; margin-bottom: 6px; }
        .card-price { font-size: 16px; font-weight: 700; color: #ef4444; margin-bottom: 14px; }

        .stock-section { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .stock-label { font-size: 11px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; }
        .stock-control {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px; padding: 4px 8px;
        }
        .stock-btn {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px; color: rgba(255,255,255,0.6); cursor: pointer; transition: background 0.15s;
        }
        .stock-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); }
        .stock-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .stock-value { font-size: 14px; font-weight: 700; color: #f4f4f5; min-width: 28px; text-align: center; }
        .stock-value.zero { color: #f87171; }

        .save-btn {
          display: flex; align-items: center; gap: 4px;
          background: #ef4444; border: none; border-radius: 6px;
          color: white; font-family: inherit; font-size: 11px; font-weight: 700;
          padding: 5px 10px; cursor: pointer; letter-spacing: 0.04em; transition: background 0.15s;
        }
        .save-btn:hover:not(:disabled) { background: #dc2626; }
        .save-btn:disabled { opacity: 0.5; }

        .toast-stack {
          position: fixed; bottom: 24px; right: 24px; z-index: 999;
          display: flex; flex-direction: column; gap: 8px; pointer-events: none;
        }
        .toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
          backdrop-filter: blur(16px); animation: slideIn 0.3s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-width: 340px;
        }
        .toast-success { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
        .toast-error { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        @media (max-width: 640px) {
          .page-title { font-size: 1.4rem; }
          .product-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
          .main-content { padding: 1.5rem 1rem 3rem; }
        }
      `}</style>
    </div>
  );
}