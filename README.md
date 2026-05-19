## Rodando a Aplicação
### Local
```bash
Pré requisitos
npm install
powershell -c "irm bun.sh/install.ps1 | iex"
bun install

 
BE (BackEnd)
npm init -y
npm install express cors mongoose dotenv
npm install --save-dev nodemon


npm install @supabase/supabase-js

npm install neo4j-driver
```

### Docker (Recomendado)
Com o docker instalado no computador e o docker desktop aberto, basta digitar
```bash
docker compose up
```
no terminal e acessar http://localhost:8080