
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

// Configurações básicas
app.use(cors()); // Permite que o Front (localhost:5173) chame essa API
app.use(express.json()); // Permite receber JSON no body das requisições

// ==========================================
// CONEXÃO COM O MONGODB
// ==========================================
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ecommerce';

mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));

const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  image: String
}, { strict: false }); 

const Product = mongoose.model('Product', productSchema);

// ==========================================
// ROTAS DA API
// ==========================================

// Rota para buscar todos os produtos
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
        attributes: {
          switch: "Red Linear",
          layout: "ABNT2",
          conexao: "USB-C"
        }
      },
      {
        title: "Monitor Ultrawide 34\"",
        price: 2100.00,
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60",
        category: "Monitores",
        stock: 5, 
        attributes: {
          resolucao: "3440 x 1440",
          taxaAtualizacao: "144Hz",
          painel: "IPS"
        }
      },
      {
        title: "Mouse Gamer Sem Fio",
        price: 180.00,
        image: "https://hp.widen.net/content/pyserlp9fv/webp/pyserlp9fv.png?w=320&h=240&dpi=72&color=ffffff00",
        category: "Periféricos",
        stock: 20, 
        attributes: {
          dpi: "16000",
          peso: "75g",
          bateria: "70h"
        }
      }
    ];

    // Limpa a coleção antes de inserir para evitar duplicações
    await Product.deleteMany({}); 
    
    // Insere os produtos no MongoDB
    await Product.insertMany(dummyProducts);
    
    res.json({ message: "✅ Produtos de teste (com estoque) criados com sucesso!" });
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
console.log("🔍 Chave do Supabase no Node:", `[${supabaseKey}]`)

const supabase = createClient(supabaseUrl, supabaseKey);

// Rota de Cadastro (Register)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    // 1. Cria o usuário no sistema de Auth do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // 2. Salva os dados extras na nossa tabela pública 'profiles'
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { id: authData.user.id, email: email, full_name: fullName }
        ]);
        
      if (profileError) throw profileError;
    }

    res.status(201).json({ message: "✅ Usuário criado com sucesso!", user: authData.user });
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(400).json({ error: error.message });
  }
});

// Rota de Login 
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    //Faz o login no sistema de Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw authError;

    //tabela 'profiles' e busca o nome do usuário que acabou de logar
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', authData.session.user.id)
      .single(); 

    if (profileError) throw profileError;

    res.json({ 
      message: "✅ Login realizado com sucesso!", 
      session: authData.session,
      profile: profileData 
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ==========================================
// CONEXÃO COM O NEO4J (Motor de Recomendação)
// ==========================================
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

// Adicionamos configurações extras para ele não ficar travado infinitamente
const neo4jDriver = neo4j.driver(
  neo4jUri, 
  neo4j.auth.basic(neo4jUser, neo4jPassword),
  {
    connectionTimeout: 10000, // Desiste após 10 segundos
    maxConnectionPoolSize: 50 
  }
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
// ROTA DE CHECKOUT (Transação Financeira)
// ==========================================
app.post('/api/checkout', async (req, res) => {
  const { userId, cart } = req.body;

  // Uma pequena validação de segurança
  if (!userId || !cart || cart.length === 0) {
    return res.status(400).json({ error: "Dados de checkout inválidos ou carrinho vazio." });
  }

  try {
    //VALIDAR ESTOQUE ANTES DE PROCESSAR
    for (const item of cart) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          error: `Produto com ID ${item.productId} não encontrado.` 
        });
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

    const { error: postgresError } = await supabase
      .from('purchases')
      .insert(purchasesToInsert);

    if (postgresError) throw postgresError;

    for (const item of cart) {
      // O Product aqui é o modelo do Mongoose
      // O $inc é um operador do MongoDB que decrementa o valor do campo 'stock' pela quantidade comprada
      await Product.findByIdAndUpdate(
        item.productId, 
        { $inc: { stock: -item.quantity } }
      );
    }
    // ---------------------------------------------------------

    // REGISTRAR A COMPRA NO NEO4J (Grafo de Recomendação)
    // Abrimos uma sessão de comunicação com o banco de grafos
    const neo4jSession = neo4jDriver.session();
    try {
      for (const item of cart) {
        await neo4jSession.run(
          `
          MERGE (u:User {id: $userId})
          MERGE (p:Product {id: $productId})
          MERGE (u)-[:COMPROU]->(p)
          `,
          { userId: userId, productId: item.productId }
        );
      }
      console.log("🕸️ Grafo atualizado: Relações de compra criadas no Neo4j!");
    } catch (neoError) {
      console.error("Aviso: Falha ao atualizar o grafo de recomendações:", neoError.message);
    } finally {
      await neo4jSession.close(); // Sempre fechamos a sessão para não travar o banco
    }

    res.status(201).json({ message: "🛒 Checkout realizado com sucesso e estoque atualizado!" });
  } catch (error) {
    console.error("Erro no checkout:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ROTA DE RECOMENDAÇÕES (Neo4j + MongoDB)
// ==========================================
app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  const neo4jSession = neo4jDriver.session();

  try {
    // Pergunta ao Neo4j: "O que as pessoas que têm o mesmo gosto que este usuário estão comprando?"
    const result = await neo4jSession.run(`
      MATCH (u:User {id: $userId})-[:COMPROU]->(p:Product)<-[:COMPROU]-(other:User)-[:COMPROU]->(rec:Product)
      WHERE NOT (u)-[:COMPROU]->(rec)
      RETURN rec.id AS productId, count(*) AS score
      ORDER BY score DESC LIMIT 4
    `, { userId });

    let recommendedIds = result.records.map(record => record.get('productId'));

    if (recommendedIds.length === 0) {
      const fallback = await neo4jSession.run(`
        MATCH ()-[r:COMPROU]->(p:Product)
        WHERE NOT (:User {id: $userId})-[:COMPROU]->(p)
        RETURN p.id AS productId, count(r) AS score
        ORDER BY score DESC LIMIT 4
      `, { userId });
      recommendedIds = fallback.records.map(record => record.get('productId'));
    }

    // Vai no MongoDB buscar a cara desses produtos
    const recommendedProducts = await Product.find({ _id: { $in: recommendedIds } });

    const formattedRecommendations = recommendedProducts.map(prod => ({
      product: {
        _id: prod._id.toString(),
        title: prod.title,
        price: prod.price,
        image: prod.image,
        category: prod.category || "Recomendado"
      },
      reason: recommendedIds.length > 0 ? "Comprado por clientes com gosto similar" : "Destaque do catálogo",
      relatedTo: prod._id.toString()
    }));

    res.json(formattedRecommendations);
  } catch (error) {
    console.error("Erro ao gerar recomendações:", error);
    res.status(500).json({ error: "Falha ao processar recomendações" });
  } finally {
    await neo4jSession.close();
  }
});

// ==========================================
// 4. INICIAR O SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Backend rodando na porta ${PORT}`);
});