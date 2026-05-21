
//MongoDB + Express 
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

//Supabase 
import { createClient } from '@supabase/supabase-js';

//Neo4j
import neo4j from 'neo4j-driver';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ROTAS ADMIN
// ==========================================

app.delete('/api/products/:id', async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.json({ message: `Produto "${deleted.title}" deletado com sucesso.` });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const updates = req.body;
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// CONEXÃO COM O MONGODB
// ==========================================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ecommerce';

mongoose.connect(MONGO_URL)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('Erro ao conectar no MongoDB:', err));

const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  image: String
}, { strict: false }); 

const Product = mongoose.model('Product', productSchema);

// ==========================================
// ROTAS DA API
// ==========================================

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos' });
  }
});

// ==========================================
// ROTA PROVISÓRIA PARA CRIAR DADOS DE TESTE
// ==========================================
app.post('/api/seed', async (req, res) => {
  try {
    const dummyProducts = [
      {
        title: "Teclado Mecânico RGB",
        price: 250.00,
        image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&auto=format&fit=crop&q=60",
        category: "Periféricos",
        isNew: true,
        stock: 15,
        purchaseCount: 320,
        attributes: { switch: "Red Linear", layout: "ABNT2", conexao: "USB-C" }
      },
      {
        title: "Monitor Ultrawide 34\"",
        price: 2100.00,
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60",
        category: "Monitores",
        stock: 5,
        purchaseCount: 85,
        attributes: { resolucao: "3440 x 1440", taxaAtualizacao: "144Hz", painel: "IPS" }
      },
      {
        title: "Mouse Gamer Sem Fio",
        price: 180.00,
        image: "https://hp.widen.net/content/pyserlp9fv/webp/pyserlp9fv.png?w=320&h=240&dpi=72&color=ffffff00",
        category: "Periféricos",
        stock: 20,
        purchaseCount: 450,
        attributes: { dpi: "16000", peso: "75g", bateria: "70h" }
      },
      {
        title: "Headset 7.1 Surround",
        price: 320.00,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
        category: "Periféricos",
        stock: 12,
        purchaseCount: 210,
        attributes: { driver: "50mm", microfone: "Removível", conexao: "USB" }
      },
      {
        title: "SSD NVMe 1TB",
        price: 450.00,
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=60",
        category: "Armazenamento",
        stock: 30,
        purchaseCount: 530,
        attributes: { leitura: "7000MB/s", escrita: "6500MB/s", interface: "PCIe 4.0" }
      },
      {
        title: "Cadeira Gamer ErgoMax",
        price: 1200.00,
        image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500&auto=format&fit=crop&q=60",
        category: "Móveis",
        stock: 8,
        purchaseCount: 95,
        attributes: { material: "Couro PU", reclinacao: "180°", lombar: "Ajustável" }
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(dummyProducts);
    
    res.json({ message: "✅ Produtos de teste criados com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar produtos de teste' });
  }
});

// ==========================================
// CONEXÃO COM O SUPABASE (PostgreSQL + Auth)
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log("🔍 URL do Supabase no Node:", `[${supabaseUrl}]`);
console.log("🔍 Chave do Supabase no Node:", `[${supabaseKey}]`);

const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: authData.user.id, email: email, full_name: fullName }]);
      if (profileError) throw profileError;
    }
    res.status(201).json({ message: "✅ Usuário criado com sucesso!", user: authData.user });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authData.session.user.id)
      .single();
    if (profileError) throw profileError;
    res.json({ message: "✅ Login realizado com sucesso!", session: authData.session, profile: profileData });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ==========================================
// CONEXÃO COM O NEO4J
// ==========================================
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

const neo4jDriver = neo4j.driver(
  neo4jUri,
  neo4j.auth.basic(neo4jUser, neo4jPassword),
  { connectionTimeout: 10000, maxConnectionPoolSize: 50 }
);

const testNeo4jConnection = async () => {
  try {
    console.log('⏳ Tentando conectar ao Neo4j...');
    await neo4jDriver.getServerInfo();
    console.log('✅ Conectado ao Neo4j AuraDB com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar no Neo4j:', error.message);
  }
};
testNeo4jConnection();

// ==========================================
// ROTA DE CHECKOUT
// ==========================================
app.post('/api/checkout', async (req, res) => {
  const { userId, cart } = req.body;

  if (!userId || !cart || cart.length === 0) {
    return res.status(400).json({ error: "Dados de checkout inválidos ou carrinho vazio." });
  }

  try {
    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Produto com ID ${item.productId} não encontrado.` });
      }
      if ((product.stock || 0) < item.quantity) {
        return res.status(400).json({
          error: `Quantidade insuficiente de "${product.title}" em estoque. Disponível: ${product.stock || 0}`
        });
      }
    }

    const purchasesToInsert = cart.map(item => ({
      user_id: userId,
      product_id: item.productId,
      price: item.unitPrice
    }));

    const { error: postgresError } = await supabase.from('purchases').insert(purchasesToInsert);
    if (postgresError) throw postgresError;

    for (const item of cart) {
      // Decrementa estoque E incrementa purchaseCount no MongoDB
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      );
    }

    // Registra no Neo4j: relação COMPROU + categoria do produto
    const neo4jSession = neo4jDriver.session();
    try {
      for (const item of cart) {
        const product = await Product.findById(item.productId);
        const category = product?.category || 'Geral';

        await neo4jSession.run(
          `
          MERGE (u:User {id: $userId})
          MERGE (p:Product {id: $productId, category: $category})
          MERGE (u)-[:COMPROU]->(p)
          `,
          { userId, productId: item.productId, category }
        );
      }
      console.log("🕸️ Grafo atualizado: relações de compra e categoria criadas no Neo4j!");
    } catch (neoError) {
      console.error("Aviso: Falha ao atualizar o grafo:", neoError.message);
    } finally {
      await neo4jSession.close();
    }

    res.status(201).json({ message: "🛒 Checkout realizado com sucesso!" });
  } catch (error) {
    console.error("Erro no checkout:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ROTA 1 — POPULARIDADE (MongoDB)
// Produtos com +200 compras, ordenados pelos mais vendidos
// ==========================================
app.get('/api/popular', async (req, res) => {
  try {
    const popular = await Product.find({ purchaseCount: { $gte: 10 } })
      .sort({ purchaseCount: -1 })
      .limit(2);

    res.json(popular.map(prod => ({
      product: {
        _id: prod._id.toString(),
        title: prod.title,
        price: prod.price,
        image: prod.image,
        category: prod.category || 'Popular',
        purchaseCount: prod.purchaseCount || 0,
        stock: prod.stock,
      },
      reason: `🔥 ${prod.purchaseCount || 0} compras`,
      relatedTo: prod._id.toString(),
    })));
  } catch (error) {
    console.error("Erro ao buscar populares:", error);
    res.status(500).json({ error: "Erro ao buscar produtos populares" });
  }
});

// ==========================================
// ROTA 2 — "OUTROS TAMBÉM COMPRARAM" (Neo4j)
// Dado um userId, recomenda produtos que usuários com
// gosto parecido compraram e que o usuário ainda não tem
// ==========================================
app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  const neo4jSession = neo4jDriver.session();

  try {
    // Usuários que compraram os mesmos produtos que eu → o que mais eles compraram?
    const result = await neo4jSession.run(`
      MATCH (u:User {id: $userId})-[:COMPROU]->(p:Product)<-[:COMPROU]-(other:User)-[:COMPROU]->(rec:Product)
      WHERE NOT (u)-[:COMPROU]->(rec)
      RETURN rec.id AS productId, count(*) AS score
      ORDER BY score DESC LIMIT 6
    `, { userId });

    let recommendedIds = result.records.map(r => r.get('productId'));

    // Fallback: se o usuário ainda não comprou nada, mostra os mais comprados no grafo
    if (recommendedIds.length === 0) {
      const fallback = await neo4jSession.run(`
        MATCH ()-[r:COMPROU]->(p:Product)
        WHERE NOT (:User {id: $userId})-[:COMPROU]->(p)
        RETURN p.id AS productId, count(r) AS score
        ORDER BY score DESC LIMIT 6
      `, { userId });
      recommendedIds = fallback.records.map(r => r.get('productId'));
    }

    const recommendedProducts = await Product.find({ _id: { $in: recommendedIds } });

    res.json(recommendedProducts.map(prod => ({
      product: {
        _id: prod._id.toString(),
        title: prod.title,
        price: prod.price,
        image: prod.image,
        category: prod.category || 'Recomendado',
        stock: prod.stock,
      },
      reason: "👥 Outros clientes também compraram",
      relatedTo: prod._id.toString(),
    })));
  } catch (error) {
    console.error("Erro ao gerar recomendações:", error);
    res.status(500).json({ error: "Falha ao processar recomendações" });
  } finally {
    await neo4jSession.close();
  }
});

// ==========================================
// ROTA 3 — RECOMENDAÇÃO POR CATEGORIA (Neo4j)
// Dado um produto, recomenda outros da mesma categoria
// que foram comprados por quem também comprou esse produto
// ==========================================
app.get('/api/category-recommendations/:productId', async (req, res) => {
  const { productId } = req.params;
  const neo4jSession = neo4jDriver.session();

  try {
    // Pega a categoria do produto no MongoDB
    const sourceProduct = await Product.findById(productId);
    if (!sourceProduct) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    const category = sourceProduct.category || 'Geral';

    // No Neo4j: quem comprou este produto também comprou quais outros da mesma categoria?
    const result = await neo4jSession.run(`
      MATCH (u:User)-[:COMPROU]->(origem:Product {id: $productId})
      MATCH (u)-[:COMPROU]->(relacionado:Product)
      WHERE relacionado.id <> $productId
        AND relacionado.category = $category
      RETURN relacionado.id AS productId, count(u) AS score
      ORDER BY score DESC
      LIMIT 6
    `, { productId, category });

    let relatedIds = result.records.map(r => r.get('productId'));

    // Fallback: se não houver dados no grafo, busca direto no MongoDB pela categoria
    if (relatedIds.length === 0) {
      const fallback = await Product.find({
        category,
        _id: { $ne: sourceProduct._id }
      }).sort({ purchaseCount: -1 }).limit(6);

      return res.json(fallback.map(prod => ({
        product: {
          _id: prod._id.toString(),
          title: prod.title,
          price: prod.price,
          image: prod.image,
          category: prod.category,
          stock: prod.stock,
        },
        reason: `🏷️ Mais vendidos em ${category}`,
        relatedTo: productId,
      })));
    }

    const relatedProducts = await Product.find({ _id: { $in: relatedIds } });

    res.json(relatedProducts.map(prod => ({
      product: {
        _id: prod._id.toString(),
        title: prod.title,
        price: prod.price,
        image: prod.image,
        category: prod.category,
        stock: prod.stock,
      },
      reason: `🏷️ Outros em ${category}`,
      relatedTo: productId,
    })));
  } catch (error) {
    console.error("Erro ao buscar por categoria:", error);
    res.status(500).json({ error: "Falha ao buscar recomendações por categoria" });
  } finally {
    await neo4jSession.close();
  }
});

app.post('/api/seed-graph', async (req, res) => {
  const neo4jSession = neo4jDriver.session();
 
  // IDs do MongoDB Atlas
  const produtos = {
    teclado:    "6a0a9b94a504db039d6818bc",  // Periféricos
    monitor:    "6a0a9b94a504db039d6818bd",  // Monitores
    mouse:      "6a0a9b94a504db039d6818be",  // Periféricos
    arduino:    "6a0ab7b4cc1cb0e67f2252ee",  // Eletrônica
    lcd:        "6a0ab7b4cc1cb0e67f2252f3",  // Eletrônica
    cofre:      "6a0ab7b4cc1cb0e67f2252f5",  // Segurança
    argolas:    "6a0ab7b4cc1cb0e67f2252ed",  // Esportes
    pipoqueira: "6a0ab7b4cc1cb0e67f2252f0",  // Eletrodomésticos
    pomada:     "6a0ab7b4cc1cb0e67f2252f4",  // Cuidados Pessoais
    queijo:     "6a0b9274ac29e88ec59e1cb5",  // Alimentos
  };
 
  // Perfis de usuário simulados, cada um com um gosto diferente
  const usuarios = [
    {
      id: "user-gamer-01",
      compras: [produtos.teclado, produtos.mouse, produtos.monitor],
    },
    {
      id: "user-gamer-02",
      compras: [produtos.teclado, produtos.mouse],
    },
    {
      id: "user-gamer-03",
      compras: [produtos.teclado, produtos.monitor],
    },
    {
      id: "user-maker-01",
      compras: [produtos.arduino, produtos.lcd],
    },
    {
      id: "user-maker-02",
      compras: [produtos.arduino, produtos.lcd, produtos.cofre],
    },
    {
      id: "user-maker-03",
      compras: [produtos.arduino, produtos.cofre],
    },
    {
      id: "user-fitness-01",
      compras: [produtos.argolas, produtos.pipoqueira],
    },
    {
      id: "user-fitness-02",
      compras: [produtos.argolas, produtos.queijo],
    },
    {
      id: "user-casa-01",
      compras: [produtos.pipoqueira, produtos.queijo],
    },
    {
      id: "user-casa-02",
      compras: [produtos.pipoqueira, produtos.queijo, produtos.pomada],
    },
    {
      id: "user-grooming-01",
      compras: [produtos.pomada, produtos.queijo],
    },
    {
      id: "user-tech-01",
      compras: [produtos.monitor, produtos.arduino, produtos.teclado],
    },
    {
      id: "user-tech-02",
      compras: [produtos.monitor, produtos.teclado],
    },
  ];
 
  try {
    // Limpa o grafo antes de recriar (evita duplicações)
    await neo4jSession.run(`MATCH (n) DETACH DELETE n`);
    console.log("🧹 Grafo limpo, recriando...");
 
    let totalRelacoes = 0;
 
    for (const usuario of usuarios) {
      for (const produtoId of usuario.compras) {
        if (!produtoId) continue; // pula undefined
 
        // Busca a categoria do produto no MongoDB
        const product = await Product.findById(produtoId);
        const category = product?.category || 'Geral';
 
        await neo4jSession.run(
          `
          MERGE (u:User {id: $userId})
          MERGE (p:Product {id: $productId, category: $category})
          MERGE (u)-[:COMPROU]->(p)
          `,
          { userId: usuario.id, productId: produtoId, category }
        );
 
        // Incrementa purchaseCount no MongoDB
        await Product.findByIdAndUpdate(produtoId, {
          $inc: { purchaseCount: 320 }
        });
 
        totalRelacoes++;
      }
    }
 
    console.log(`Seed concluído: ${usuarios.length} usuários, ${totalRelacoes} relações`);
 
    res.json({
      message: `Grafo populado com sucesso!`,
      usuarios: usuarios.length,
      relacoes: totalRelacoes,
      perfis: {
        gamers: "user-gamer-01, user-gamer-02 → recomendam teclado/mouse/monitor entre si",
        makers: "user-maker-01/02/03 → recomendam arduino, lcd, cofre entre si",
        fitness: "user-fitness-01/02 → recomendam argolas + pipoqueira/queijo",
        casa: "user-casa-01/02, user-grooming-01 → recomendam pipoqueira, queijo, pomada",
        tech: "user-tech-01/02 → recomendam monitor + teclado"
      }
    });
  } catch (error) {
    console.error("Erro no seed do grafo:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await neo4jSession.close();
  }
});

// ==========================================
// INICIAR O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Backend rodando na porta ${PORT}`);
});
