# RotaExpress | Documentação Técnica
Integrantes

Daniel Barroso de Oliveira	

Kaio Lopes Custódio da Silva
## Sumário

1. Tema Escolhido  
2. Justificativa dos Bancos de Dados  
	2.1 PostgreSQL (via Supabase)  
	2.2 MongoDB: Banco de Documentos  
	2.3 Neo4j: Banco de Grafos  
3. Arquitetura do Backend  
4. Documentação das Rotas da API  
	4.1 Produtos (MongoDB)  
	4.2 Autenticação (PostgreSQL / Supabase)  
	4.3 Checkout (PostgreSQL + MongoDB + Neo4j)  
	4.4 Recomendações (Neo4j + MongoDB)  
5. Lógica do Frontend — `useStorefront`  
6. Painel Administrativo  
7. Fluxo Completo de uma Compra
8. Rodando a aplicação
---

## 1. Tema Escolhido

O **RotaExpress** é um marketplace de e-commerce. A plataforma permite que usuários naveguem em um catálogo de produtos, recebam recomendações personalizadas com base em seu histórico de compras e realizem o checkout dos produtos selecionados.

O projeto foi desenvolvido como uma aplicação **poliglota**, ou seja, cada responsabilidade do sistema é gerenciada pelo banco de dados mais adequado para aquele tipo de operação:

|Responsabilidade|Banco|
|---|---|
|Autenticação, sessões e transações financeiras|PostgreSQL (via Supabase)|
|Catálogo de produtos com atributos heterogêneos|MongoDB|
|Motor de recomendação baseado em relacionamentos|Neo4j|

---

## 2. Justificativa dos Bancos de Dados

### 2.1 PostgreSQL (via Supabase)

**Responsabilidades:** autenticação de usuários, gerenciamento de sessões, armazenamento de pedidos e histórico de compras (tabela `purchases`).

**Por que PostgreSQL?**

- Transações **ACID** garantem que nenhuma compra seja registrada parcialmente, se o estoque é decrementado no MongoDB mas a gravação no Supabase falhar, o sistema pode desfazer a operação.
- O modelo **relacional** é ideal para a integridade referencial entre usuários, pedidos e itens de compra.
- O **Supabase** fornece autenticação pronta (`signUp` / `signInWithPassword`) com JWT, eliminando a necessidade de implementar hashing de senhas manualmente.
- Consultas analíticas sobre pedidos (total por usuário, histórico cronológico) são naturalmente expressas em SQL.

---

### 2.2 MongoDB: Banco de Documentos

**Responsabilidades:** catálogo completo de produtos, incluindo imagens, preços, categorias, estoque e atributos específicos por tipo de produto.
Sua arquitetura se organiza em **Coleções**, que armazenam **Documentos** compostos por **Campos**, ao invés de tabelas e tuplas.
#### MongoDB no Teorema CAP
Em sistemas distribuídos, o MongoDB é classificado como **CP (Consistência e Tolerância ao Particionamento)**. Isso significa que, operando com diversas réplicas, ele busca garantir que os nós possuam dados consistentes, podendo sacrificar a disponibilidade (ficar indisponível) para manter essa consistência em caso de falhas na rede.

#### Por que MongoDB no RotaExpress?

- Produtos de categorias diferentes possuem **atributos distintos**, um teclado tem `switch` e `layout`; um monitor tem `resolução` e `taxa de atualização`. O campo `attributes` como subdocumento livre acomoda essa heterogeneidade sem migrações de schema.
- O catálogo é um dado de **leitura massiva e baixa frequência de escrita**, exatamente o cenário em que o MongoDB substitui consistência absoluta por velocidade de leitura.
- A aplicação não pode fazer usuários esperarem pela resolução de múltiplos JOINs para renderizar uma listagem de produtos.
- O operador `$inc` decrementa o estoque **atomicamente** durante o checkout, evitando condições de corrida.

A configuração `strict: false` no Mongoose espelha o modelo schema-on-read do MongoDB, permitindo que cada produto carregue seus próprios campos sem quebrar a aplicação.
- **Schema-on-read:** ao invés de forçar a tipagem e a estrutura no momento da escrita (como fazem os bancos relacionais), o MongoDB deixa o tipo ser inferido e trata a estrutura dos dados na hora da leitura.
#### Exemplo de documento no catálogo

```json
{
  "_id": "xyz",
  "title": "Teclado Mecânico",
  "price": 250.00,
  "stock": 15,
  "category": "Periféricos",
  "attributes": {
    "switch": "Red Linear",
    "layout": "ABNT2",
    "conexao": "USB-C"
  }
}
```

---

### 2.3 Neo4j: Banco de Grafos

**Responsabilidades:** armazenar relacionamentos entre usuários e produtos comprados, e derivar recomendações por travessias no grafo.
O Neo4j utiliza uma estrutura de **grafo de propriedades**. Seu funcionamento se baseia em três pilares:

- **Nós:** representam entidades (ex: `User`, `Product`). No RotaExpress, um nó `User` representa um cliente e um nó `Product` representa um item do catálogo.
- **Vértices (Relacionamentos):** definem como as entidades se conectam, como `COMPROU`. Os relacionamentos têm direção e podem carregar propriedades (ex: a data em que a relação ocorreu).
- **Propriedades:** tanto nós quanto vértices podem possuir pares chave-valor. Por exemplo, um nó `User` pode ter `{ id: "xyz" }` 
Assim como o MongoDB, o Neo4j também usa **schema-on-read**, o que permite relacionar qualquer tipo de nó com outro, lidando perfeitamente com entidades heterogêneas.

#### Linguagem Cypher

Para fazer consultas, o Neo4j utiliza a linguagem **Cypher**. Esta é a consulta usada para recomendações:

```cypher
-- "Quem comprou o que eu comprei, e o que mais eles compraram?"
MATCH (u:User {id: $userId})-[:COMPROU]->(p:Product)<-[:COMPROU]-(other:User)-[:COMPROU]->(rec:Product)
WHERE NOT (u)-[:COMPROU]->(rec)
RETURN rec.id AS productId, count(*) AS score
ORDER BY score DESC LIMIT 4
```

#### Neo4j no Teorema CAP

O Neo4j é classificado como **CA (Consistência e Disponibilidade)** e é **totalmente ACID**, diferente do MongoDB. Isso significa que ele se comporta de forma muito parecida com um banco relacional tradicional, priorizando a integridade dos dados. O comando `MERGE` garante que nós e relacionamentos sejam criados apenas uma vez, sem duplicatas.

#### Por que Neo4j no RotaExpress?

- Recomendações do tipo "usuários com gosto similar compraram X" são naturalmente modeladas como um grafo: `(User)-[:COMPROU]->(Product)`.
- Em um banco relacional, a mesma consulta exigiria múltiplos JOINs auto-referenciais que crescem exponencialmente com o volume de dados.
- O Cypher permite expressar a travessia de forma declarativa e legível.
- O `MERGE` no checkout garante que o grafo de relacionamentos seja atualizado sem duplicatas a cada nova compra.

---

## 3. Arquitetura do Backend

O Backend é uma aplicação **Node.js + Express** que age como gateway único para os três bancos. O Frontend (React + TanStack Router) se comunica exclusivamente com este servidor na porta `3000`.

```
┌─────────────────────────────┐
│     Frontend (React/Vite)   │
│                             │
└────────────┬────────────────┘
             │ HTTP REST
┌────────────▼────────────────┐
│   Backend (Node.js/Express) │
│   localhost:3000            │
└──────┬──────────┬───────────┘
       │          │           │
  ┌────▼───┐ ┌───▼────┐ ┌────▼────┐
  │MongoDB │ │Supabase│ │ Neo4j   │
  │Catálogo│ │Auth/PG │ │ Grafo   │
  └────────┘ └────────┘ └─────────┘
```

| Camada            | Tecnologia                     | Função                                                 |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| Frontend          | React + Vite + TanStack Router | consumidor da API REST                                 |
| Backend           | Node.js + Express              | Gateway e orquestrador dos três bancos                 |
| Auth / Transações | Supabase (PostgreSQL)          | Usuários, sessões JWT, tabela `purchases` e `profiles` |
| Catálogo          | MongoDB + Mongoose             | Coleção com documentos flexíveis                       |
| Recomendações     | Neo4j AuraDB                   | Grafo `(User)-[:COMPROU]->(Product)`                   |

O arquivo `index.js` inicializa as três conexões em paralelo na inicialização do servidor e registra todas as rotas antes de chamar `app.listen()`.

---

## 4. Documentação das Rotas da API

### 4.1 Produtos (MongoDB)

---

#### `GET /api/products`

Retorna todos os documentos da coleção `products` no MongoDB.

|Campo|Detalhe|
|---|---|
|Auth|Nenhuma|
|Banco|MongoDB|
|Resposta 200|Array de objetos `Product` (JSON)|
|Resposta 500|`{ message: "Erro ao buscar produtos" }`|

**Exemplo de item retornado:**

```json
{
  "_id": "64abc...",
  "title": "Teclado Mecânico",
  "price": 250,
  "stock": 15,
  "category": "Periféricos",
  "attributes": { "switch": "Red Linear", "layout": "ABNT2" }
}
```

---

#### `DELETE /api/products/:id`

Remove permanentemente um produto do MongoDB pelo seu `_id`.

| Campo        | Detalhe                                                   |
| ------------ | --------------------------------------------------------- |
| Banco        | MongoDB                                                   |
| Resposta 200 | `{ message: "Produto \"título\" deletado com sucesso." }` |
| Resposta 404 | `{ error: "Produto não encontrado." }`                    |
| Resposta 500 | `{ error: mensagem do erro }`                             |

---

#### `PATCH /api/products/:id`

Atualiza campos de um produto existente — por exemplo, ajuste de estoque pelo painel admin.

| Campo        | Detalhe                                         |
| ------------ | ----------------------------------------------- |
| Banco        | MongoDB                                         |
| Body         | `{ "stock": 10 }` (qualquer campo do documento) |
| Resposta 200 | Documento atualizado (JSON)                     |
| Resposta 404 | `{ error: "Produto não encontrado." }`          |

Internamente usa o operador `$set` do Mongoose para aplicar apenas os campos recebidos no body, preservando os demais atributos do documento.

---
### 4.2 Autenticação (PostgreSQL / Supabase)

---

#### `POST /api/auth/register`

Cria um novo usuário no sistema de autenticação do Supabase e insere um registro na tabela pública `profiles` com o nome completo.

|Campo|Detalhe|
|---|---|
|Banco|PostgreSQL (Supabase Auth + tabela `profiles`)|
|Body|`{ "email": "...", "password": "...", "fullName": "..." }`|
|Resposta 201|`{ message: "Usuário criado com sucesso!", user: {...} }`|
|Resposta 400|`{ error: mensagem do Supabase }`|

**Fluxo interno:**

1. `supabase.auth.signUp()` cria o usuário no Auth do Supabase.
2. Se bem-sucedido, insere `{ id, email, full_name }` na tabela `profiles`.

---

#### `POST /api/auth/login`

Autentica o usuário via Supabase e retorna a sessão JWT junto com os dados do perfil.

|Campo|Detalhe|
|---|---|
|Banco|PostgreSQL (Supabase Auth + tabela `profiles`)|
|Body|`{ "email": "...", "password": "..." }`|
|Resposta 200|`{ session: {...}, profile: { full_name: "..." } }`|
|Resposta 401|`{ error: mensagem do Supabase }`|

Após o login bem-sucedido, o frontend serializa o objeto de sessão em `localStorage` (chave `polyglot_session`) para manter o usuário logado após recarregar a página.

---

### 4.3 Checkout (PostgreSQL + MongoDB + Neo4j)

#### `POST /api/checkout`

Rota central que **orquestra os três bancos em sequência** para processar uma compra.

|Campo|Detalhe|
|---|---|
|Auth|Sessão de usuário (`userId` obrigatório)|
|Body|`{ "userId": "...", "cart": [{ "productId": "...", "quantity": 1, "unitPrice": 250 }] }`|
|Resposta 201|`{ message: "Checkout realizado com sucesso e estoque atualizado!" }`|
|Resposta 400|Produto não encontrado ou estoque insuficiente|
|Resposta 500|Erro interno|

**Sequência de operações:**

```
1. [MongoDB]    Valida estoque de cada item do carrinho
2. [PostgreSQL] Insere registros na tabela purchases (Supabase)
3. [MongoDB]    Decrementa o campo stock via operador $inc
4. [Neo4j]      MERGE nos nós User/Product + cria relação COMPROU
```

> Se a etapa do Neo4j falhar, o erro é apenas logado e a resposta de sucesso ainda é enviada ao cliente, as recomendações são consideradas não críticas e não devem bloquear o fluxo de compra.

---

### 4.4 Recomendações (Neo4j + MongoDB)

#### `GET /api/popular`

Retorna os produtos mais populares com base no campo `purchaseCount` armazenado no MongoDB.

| Campo | Detalhe |
|---|---|
| Banco | MongoDB |
| Critério | Produtos com `purchaseCount >= 10` |
| Ordenação | Mais comprados primeiro |
| Limite | 2 produtos |
| Resposta 500 | `{ error: "Erro ao buscar produtos populares" }` |

---

#### `GET /api/recommendations/:userId`

Consulta o Neo4j para identificar produtos comprados por usuários com comportamento similar e complementa os dados usando MongoDB.

| Campo | Detalhe |
|---|---|
| Parâmetro | `userId` — ID do usuário |
| Banco | Neo4j + MongoDB |
| Resposta 200 | Array de recomendações |
| Fallback | Produtos mais comprados do grafo |
| Resposta 500 | `{ error: "Falha ao processar recomendações" }` |

**Consulta Cypher principal:**

```cypher
MATCH (u:User {id: $userId})-[:COMPROU]->(p:Product)<-[:COMPROU]-(other:User)-[:COMPROU]->(rec:Product)
WHERE NOT (u)-[:COMPROU]->(rec)
RETURN rec.id AS productId, count(*) AS score
ORDER BY score DESC LIMIT 6
```

---

#### `GET /api/category-recommendations/:productId`

Recomenda produtos da mesma categoria com base no comportamento de compra dos usuários.

| Campo | Detalhe |
|---|---|
| Parâmetro | `productId` — ID do produto |
| Banco | Neo4j + MongoDB |
| Resposta 200 | Produtos relacionados por categoria |
| Fallback | Produtos mais vendidos da categoria no MongoDB |
| Resposta 404 | `{ error: "Produto não encontrado." }` |
| Resposta 500 | `{ error: "Falha ao buscar recomendações por categoria" }` |

**Consulta Cypher principal:**

```cypher
MATCH (u:User)-[:COMPROU]->(origem:Product {id: $productId})
MATCH (u)-[:COMPROU]->(relacionado:Product)
WHERE relacionado.id <> $productId
  AND relacionado.category = $category
RETURN relacionado.id AS productId, count(u) AS score
ORDER BY score DESC
LIMIT 6
```
---
## 5. Lógica do Frontend — useStorefront

O hook `useStorefront.ts`é o orquestrador central do estado do frontend. Ele gerencia simultaneamente dados dos três bancos e expõe uma interface unificada para os componentes.
### 5.1 Estado gerenciado

| Estado                                       | Origem     | Descrição                                           |
| -------------------------------------------- | ---------- | --------------------------------------------------- |
| `products` / `productsLoading`               | MongoDB    | Catálogo completo de produtos                       |
| `recommendations` / `recommendationsLoading` | Neo4j      | Sugestões personalizadas                            |
| `session`                                    | PostgreSQL | Dados do usuário logado (`userId`, `name`, `email`) |
| `cart`                                       | Local      | Itens no carrinho (persistidos no checkout)         |

### 5.2 Efeitos (useEffect)

O hook possui três `useEffect` com responsabilidades distintas:

- **Hidratação da sessão:** ao montar, lê o `localStorage` (chave `polyglot_session`) e restaura a sessão do usuário sem exigir novo login.
- **Carregamento da vitrine:** dependência em `session.userId` — ao fazer login ou logout, busca novamente as recomendações no Neo4j para o usuário atual. O catálogo MongoDB é carregado sempre.
- **Efeito legado:** um segundo `useEffect` sem dependências (refatoração em andamento) que chama o catálogo e as recomendações na montagem inicial.

### 5.3 Ações principais

|Função|Comportamento|
|---|---|
|`addToCart(product)`|Verifica `stock > 0`, aplica atualização otimista no estado local|
|`removeFromCart(productId)`|Remove o item do estado local|
|`checkout()`|Requer `userId`; chama `POST /api/checkout`; limpa o carrinho em caso de sucesso|
|`logout()`|Chama `authApi.logout()`, limpa `localStorage` e estado de sessão e carrinho|

---

## 6. Painel Administrativo

A rota `/admin` expõe a página `AdminPage` (`admin.tsx`), acessível somente após autenticação com as credenciais de administrador (`admin@rotaexpress.com` / `admin@2025`).

A autenticação do admin é simplificada: as credenciais são verificadas no frontend (`login.tsx`) e uma flag `admin_auth = "true"` é salva no `sessionStorage`. O guard no `AdminPage` redireciona para `/login` se a flag estiver ausente.

### Funcionalidades

- **Listagem** de todos os produtos com imagem, título, preço, categoria e estoque atual.
- **Exclusão de produto:** chama `DELETE /api/products/:id` com confirmação do usuário.
- **Ajuste de estoque:** controles `+`/`-` modificam o valor localmente; o botão _Salvar_ só aparece quando há alteração pendente e chama `PATCH /api/products/:id`.

---

## 7. Fluxo Completo de uma Compra

```
Usuário acessa a vitrine
        │
        ▼
GET /api/products  ──────────────────────────────►  MongoDB
        │
        ▼ (se logado)
GET /api/recommendations/:userId  ───────────────►  Neo4j → MongoDB
        │
        ▼
Usuário adiciona itens ao carrinho
(atualização otimista no estado React)
        │
        ▼
POST /api/checkout
        │
        ├─ 1. Valida estoque  ────────────────────►  MongoDB
        ├─ 2. Grava purchases  ──────────────────►  PostgreSQL (Supabase)
        ├─ 3. Decrementa stock ($inc)  ──────────►  MongoDB
        └─ 4. Cria relação COMPROU (MERGE)  ─────►  Neo4j
        │
        ▼
Frontend limpa carrinho → alerta de sucesso 🎉
        │
        ▼
(próxima visita) recomendações mais precisas  ───►  Neo4j usa as novas relações
```

---
## 8. Rodando a Aplicação
### Local
```bash
Pré requisitos

No terminal, na pasta FrontEnd:
npm install
powershell -c "irm bun.sh/install.ps1 | iex"
bun install

Na pasta EcommerceBE
npm init -y
npm install express cors mongoose dotenv
npm install --save-dev nodemon
npm install @supabase/supabase-js
npm install neo4j-driver

Para executar é preciso executar:
BackEnd: npm run dev
FrontEnd: bun run dev
(O Vite vai te fornecer o link da aplicação, ou apenas acesse http://localhost:8080)
```

### Docker (Recomendado)
Com o docker instalado no computador e o docker desktop aberto, basta digitar
```bash
docker compose up
```
no terminal e acessar http://localhost:8080
