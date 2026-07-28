# RelayHub

Webhook Orchestrator Platform — a multi-tenant webhook ingestion, delivery,
retry, and observability system (Hookdeck / Svix / Stripe-Webhooks class).

Full architecture: [`docs/architecture/RelayHub-Architecture.md`](./docs/architecture/RelayHub-Architecture.md)

## Status

**Phase 2 — Database Layer** (see `docs/phases/`)

## Stack

Node.js 20 · TypeScript · Express · Prisma · PostgreSQL · Redis · BullMQ ·
Socket.IO · React · Vite · TailwindCSS · pnpm workspaces · Docker · GitHub Actions

## Prerequisites

- Node.js 20.x (`nvm use`)
- pnpm 9.x (`corepack enable && corepack prepare pnpm@9.7.0 --activate`)
- Docker Desktop (for Postgres/Redis)

## Getting started

```bash
# 1. Install dependencies across all workspaces
pnpm install

# 2. Copy env template
cp .env.example .env

# 3. Start data stores (Postgres + Redis)
docker compose up -d

# 4. Run the API service
pnpm dev:api        # http://localhost:4000/healthz

# 5. Run the worker service (separate terminal)
pnpm dev:worker      # http://localhost:4100/healthz

# 6. Run the web dashboard (separate terminal)
pnpm dev:web         # http://localhost:5173
```

## Common commands

```bash
pnpm lint            # ESLint across all workspaces
pnpm typecheck       # tsc --noEmit across all workspaces
pnpm test            # Jest unit/integration tests (api, worker)
pnpm build           # Production build across all workspaces
pnpm format          # Prettier write
```

## Monorepo layout

```
apps/
  api/       Express API service
  worker/    BullMQ worker service (health-check only until Phase 7)
  web/       React dashboard (Vite)
packages/
  shared-types/    Contracts shared between backend and frontend
  shared-config/   Shared env-validation helpers
docs/
  architecture/    Full architecture document
  phases/          One doc per implementation phase
infra/
  docker/          Dockerfiles (added per-service as each gains real logic)
```

## Project docs

Each implementation phase has its own doc in `docs/phases/` covering design
decisions, code, tests, and verification steps for that phase.
