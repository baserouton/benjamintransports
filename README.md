# Locadora Admin

Painel administrativo para gestão de frota, clientes, locações, manutenção e financeiro.

## Stack

| Camada       | Tecnologia                          |
| ------------ | ----------------------------------- |
| UI           | React 19 + TypeScript               |
| Framework    | TanStack Start (SSR)                |
| Routing      | TanStack Router (file-based)        |
| Backend      | TanStack Server Functions           |
| Banco        | MariaDB/MySQL + Drizzle ORM         |
| Autenticação | Sessão HTTP-only + senha com scrypt |
| Estilo       | Tailwind CSS 4 + shadcn/ui          |
| Build        | Vite 8 + Nitro (`node-server`)      |

## Arquitetura atual

Monólito modular: frontend e backend no mesmo deploy, com fronteiras explícitas.

- O browser acessa o backend exclusivamente por funções `createServerFn`
- Handlers, autenticação, regras transacionais e acesso ao banco ficam em `src/server`
- Toda função de dados valida a sessão no servidor
- Sessões ficam no MariaDB; o cookie contém somente um token opaco HTTP-only
- Locações e manutenções gravam seus lançamentos financeiros na mesma transação
- Preferência de idioma continua local ao navegador

## Pré-requisitos

- Node.js 20+
- npm

## Desenvolvimento

```sh
npm install
npm run dev
```

App em [http://localhost:8080](http://localhost:8080).

## Scripts

| Comando               | Descrição                                      |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Servidor de desenvolvimento                    |
| `npm run build`       | Build de produção                              |
| `npm run preview`     | Preview do build                               |
| `npm run db:generate` | Gera migration após alterar o schema           |
| `npm run db:migrate`  | Aplica migrations pendentes                    |
| `npm run db:seed`     | Carrega os dados iniciais de forma idempotente |
| `npm run db:studio`   | Interface de inspeção do Drizzle               |
| `npm run lint`        | ESLint                                         |
| `npm run format`      | Prettier                                       |

## Estrutura

```
src/
  components/     # UI da aplicação + shadcn
  domain/         # Modelos compartilhados, sem dependência de infraestrutura
  hooks/          # Hooks compartilhados
  lib/            # Adapters do frontend, i18n, utils e error handling
  routes/         # Rotas file-based (TanStack Router)
  server/
    auth/         # Hash de senha, cookie e sessões
    db/           # Conexão e schema Drizzle
    functions/    # Pontes RPC e handlers server-only
    repositories/ # Persistência e transações
  server.ts       # Entry SSR
  start.ts        # Middleware TanStack Start
  router.tsx      # Factory do router + QueryClient
drizzle/          # Migrations SQL versionadas
scripts/seed.ts   # Dados iniciais
```

## Configuração

Copie `.env.example` para `.env` e configure `DATABASE_URL` e
`SEED_ADMIN_PASSWORD`. Nunca commite o arquivo `.env`.
