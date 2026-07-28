# RelayHub

Welcome to **RelayHub**, a production-grade Webhook Orchestrator Platform. 

If you are building an application that needs to receive or send webhooks reliably, RelayHub is designed to be the robust middle layer that handles ingestion, routing, delivery, retries, and observability. It is built in the same class as enterprise webhook systems like Hookdeck, Svix, or Stripe-Webhooks.

---

## 1. What is the current status?

**Phase 21 — Deployment & Final Integration (Complete)**

The core platform architecture is fully implemented. The system has successfully completed all 21 phases of development. The React Frontend, Express API, and Background Worker services are all fully integrated, tested, and ready to run.

You can read the full architectural deep dive here: [`docs/architecture/RelayHub-Architecture.md`](./docs/architecture/RelayHub-Architecture.md). To see the step-by-step history of how this project was built, check the `docs/phases/` directory.

---

## 2. What technology does it use?

RelayHub is built as a highly scalable **pnpm workspace monorepo** using the following tech stack:

- **Backend / API**: Node.js 20, TypeScript, Express, Socket.IO
- **Background Workers**: BullMQ (for robust retry engines, fan-out delivery, and dead-letter queues)
- **Database / Data Stores**: PostgreSQL (via Prisma ORM) and Redis
- **Frontend Dashboard**: React, Vite, TailwindCSS, TanStack Query, Zustand
- **Infrastructure**: Docker, GitHub Actions

---

## 3. How do I run it locally?

Getting RelayHub running on your local machine takes less than 2 minutes.

### Prerequisites
- **Node.js**: v20.x or higher (`nvm use`)
- **pnpm**: v9.x (`corepack enable && corepack prepare pnpm@9.7.0 --activate`)
- **Docker Desktop**: Required to run PostgreSQL and Redis containers.

### Step-by-Step Guide

```bash
# 1. Install all dependencies across the monorepo
pnpm install

# 2. Setup your environment variables
cp .env.example .env

# 3. Start the Postgres and Redis data stores in the background
docker compose up -d

# 4. Initialize the Database Schema
pnpm --filter @relayhub/api run db:push

# 5. Start the backend API service (Terminal 1)
pnpm dev:api         # Runs on http://localhost:3000

# 6. Start the background worker service (Terminal 2)
pnpm dev:worker      # Processes webhooks and handles retries

# 7. Start the Web Dashboard (Terminal 3)
pnpm dev:web         # Runs on http://localhost:5173
```
*Note: Once the dashboard is running on port 5173, register a new account to automatically create your first Organization and Environment.*

---

## 4. Where is everything located?

This repository is organized into distinct applications and shared packages:

```text
apps/
  ├── api/             # The Express API service (Port 3000)
  ├── worker/          # BullMQ background delivery, fan-out, & retry service
  └── web/             # The React Dashboard UI (Port 5173)

packages/
  ├── shared-types/    # TypeScript contracts shared between backend and frontend
  └── shared-config/   # Shared environment validation helpers

docs/
  ├── architecture/    # Comprehensive architecture diagrams and specs
  └── phases/          # Detailed documentation for all 21 implementation phases

infra/
  └── docker/          # Dockerfiles for production deployments
```

---

## 5. Common Commands for Developers

If you wish to contribute or modify the code, here are the most common workspace commands:

```bash
pnpm lint            # Runs ESLint across all workspaces
pnpm typecheck       # Runs tsc --noEmit across all workspaces to check for TypeScript errors
pnpm test            # Runs Jest unit and integration tests (api, worker)
pnpm build           # Creates production builds for all apps and packages
pnpm format          # Runs Prettier to format code
```
