/**
 * Mock data simulating the polyglot backend response shapes.
 *
 * The real backend uses three databases:
 *  - PostgreSQL  -> user, session, cart, orders (ACID transactional)
 *  - MongoDB     -> product catalog (flexible JSON documents)
 *  - Neo4j       -> recommendation graph (relationships between products/users)
 */

// ---------- MongoDB shape ----------
// Products are documents — each can have different `attributes` keys.
export interface Product {
  _id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  stock?: number; // Stock disponível (0 = esgotado)
  // Flexible per-product attributes — this is the whole point of using Mongo.
  attributes: Record<string, string | number | boolean>;
}

// ---------- Neo4j shape ----------
// A recommendation carries the product + a "reason" derived from graph traversal.
export interface Recommendation {
  product: Product;
  reason: string;       // e.g. "Users who bought X also bought this"
  score: number;        // graph relevance score [0..1]
  relatedTo?: string;   // source product id
}

// ---------- PostgreSQL shape ----------
export interface CartItem {
  productId: string;
  quantity: number;
  // Snapshot of price at the time it was added (transactional integrity)
  unitPrice: number;
}

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  loggedInAt: string;
  avatar?: string; // <-- Adicione como opcional aqui!
}

// Image URLs use Unsplash source so the mock looks real without bundling assets.
const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=800&q=70`;

export const MOCK_PRODUCTS: Product[] = [
  {
    _id: "p_001",
    title: "Fones de Ouvido Aurora Sem Fio",
    price: 249.0,
    currency: "USD",
    image: img("photo-1518444065439-e933c06ce9cd"),
    category: "Áudio",
    stock: 8,
    attributes: { color: "Midnight", batteryHours: 38, noiseCancelling: true },
  },
  {
    _id: "p_002",
    title: "Teclado Mecânico Nimbus",
    price: 159.0,
    currency: "USD",
    image: img("photo-1587829741301-dc798b83add3"),
    category: "Periféricos",
    stock: 0, // Esgotado
    attributes: { switch: "Tactile Brown", layout: "75%", backlight: "RGB" },
  },
  {
    _id: "p_003",
    title: "Lâmpada Inteligente Lumen",
    price: 79.0,
    currency: "USD",
    image: img("photo-1507473885765-e6ed057f782c"),
    category: "Casa",
    stock: 15,
    attributes: { lumens: 800, smartHome: "Matter", dimmable: true },
  },
  {
    _id: "p_004",
    title: "Mochila Ultralight Vortex",
    price: 119.0,
    currency: "USD",
    image: img("photo-1553062407-98eeb64c6a62"),
    category: "Viagem",
    stock: 5,
    attributes: { capacityL: 22, waterproof: true, weightKg: 0.6 },
  },
  {
    _id: "p_005",
    title: "Caneca de Cerâmica Solace",
    price: 24.0,
    currency: "USD",
    image: img("photo-1514228742587-6b1558fcca3d"),
    category: "Casa",
    stock: 0, // Esgotado
    attributes: { volumeMl: 350, microwaveSafe: true, handmade: true },
  },
  {
    _id: "p_006",
    title: "Relógio de Fitness Pulse",
    price: 189.0,
    currency: "USD",
    image: img("photo-1575311373937-040b8e1fd5b6"),
    category: "Wearables",
    stock: 12,
    attributes: { gps: true, batteryDays: 14, waterRating: "5ATM" },
  },
  {
    _id: "p_007",
    title: "Câmera Portátil Echo",
    price: 549.0,
    currency: "USD",
    image: img("photo-1519183071298-a2962feb14f4"),
    category: "Fotografia",
    stock: 3,
    attributes: { sensor: "APS-C", megapixels: 26, lensMount: "X" },
  },
  {
    _id: "p_008",
    title: "Vaso de Planta Interno Glade",
    price: 42.0,
    currency: "USD",
    image: img("photo-1485955900006-10f4d324d411"),
    category: "Casa",
    stock: 20,
    attributes: { material: "Stoneware", drainage: true, sizeCm: 18 },
  },
  {
    _id: "p_009",
    title: "Tênis de Linho Drift",
    price: 98.0,
    currency: "USD",
    image: img("photo-1542291026-7eec264c27ff"),
    category: "Vestuário",
    stock: 0, // Esgotado
    attributes: { material: "Linen", color: "Sand", vegan: true },
  },
  {
    _id: "p_010",
    title: "Carregador Solar Helio",
    price: 69.0,
    currency: "USD",
    image: img("photo-1509395176047-4a66953fd231"),
    category: "Ao ar livre",
    stock: 7,
    attributes: { watts: 21, ports: 2, foldable: true },
  },
  {
    _id: "p_011",
    title: "Panela de Ferro Fundido Forge",
    price: 64.0,
    currency: "USD",
    image: img("photo-1556910103-1c02745aae4d"),
    category: "Cozinha",
    stock: 10,
    attributes: { diameterCm: 26, preSeasoned: true, weightKg: 2.1 },
  },
  {
    _id: "p_012",
    title: "Carteira de Couro Atlas",
    price: 89.0,
    currency: "USD",
    image: img("photo-1517254797898-04edd251bfb3"),
    category: "Acessórios",
    stock: 6,
    attributes: { material: "Full-grain leather", rfidBlocking: true },
  },
];

// Recommendations would come from a Cypher query in Neo4j —
// here we just hand-pick a few to show the UI pattern.
export const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    product: MOCK_PRODUCTS[0],
    reason: "Usuários que compraram seu último item também compraram isso",
    score: 0.94,
    relatedTo: "p_002",
  },
  {
    product: MOCK_PRODUCTS[6],
    reason: "Em tendência entre compradores similares a você",
    score: 0.89,
  },
  {
    product: MOCK_PRODUCTS[3],
    reason: "Frequentemente comprado junto com Relógio de Fitness Pulse",
    score: 0.86,
    relatedTo: "p_006",
  },
  {
    product: MOCK_PRODUCTS[9],
    reason: "Corresponde ao seu interesse em Engrenagens ao ar livre",
    score: 0.81,
  },
];

export const MOCK_SESSION: UserSession = {
  userId: "u_42",
  name: "Alex Rivera",
  email: "alex@example.com",
  loggedInAt: new Date().toISOString(),
};
