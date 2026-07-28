# Phase 1 — Monorepo & Tooling Foundation

## 1. What we're building

The scaffolding every later phase depends on: a pnpm-workspaces monorepo with three apps (`api`, `worker`, `web`) and two shared packages (`shared-config`, `shared-types`), unified TypeScript/ESLint/Prettier config, a Docker Compose file for local Postgres/Redis, and a GitHub Actions CI job. Each app boots to a real, testable `/healthz` endpoint — nothing more, nothing stubbed.

## 2. Why it's needed

Every subsequent phase (auth, ingestion, queues, delivery) needs a place to live with consistent typing, linting, and test wiring already solved — otherwise we'd be making monorepo-tooling decisions piecemeal, mid-feature, which is how inconsistent codebases happen. Getting CI green on day one also means every future phase either keeps it green or explicitly explains why not.

## 3. Where it fits in the architecture

Directly implements **Section 7 (Folder Structure)** and **Section 30 (CI/CD Pipeline)** of the architecture doc. The `api` and `worker` skeletons are the literal entry points that Sections 4–6 (System Architecture, Diagrams, Clean Architecture Layers) will be built into starting Phase 2.

## 4. Design decisions

| Decision | Choice | Why |
|---|---|---|
| Monorepo tool | pnpm workspaces, no Nx/Turborepo | Two apps + a couple packages don't yet need a build-graph orchestrator; plain workspaces keep every command visible and explainable in an interview rather than hidden behind a task-runner's caching layer. Revisit if build times become a real problem. |
| Package manager | pnpm | Faster installs, strict dependency resolution (no phantom deps), native workspace protocol (`workspace:*`) for internal packages. |
| Linting | ESLint flat config, single root file | One config to reason about at this scale; avoids the `packages/eslint-config` publishing indirection mentioned in the original folder sketch — **explicit deviation from Section 7**, justified by unnecessary overhead for two consumers. |
| TS strictness | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters` all on | Catches real bugs at the type layer before they become runtime bugs in a queue/retry system where silent `undefined` handling is exactly the kind of bug that causes duplicate or dropped deliveries later. |
| API/Worker separation | Two independent Express-ish processes from commit #1 (worker currently only runs a health server) | Matches Section 4/13 — proves the "these scale independently" story is real infrastructure, not a claim added retroactively before a demo. |
| Env validation | Zod schema per service, parsed at boot, shared base schema in `shared-config` | Fail fast on misconfiguration (Section 23) instead of a `NODE_ENV` typo surfacing three layers deep at 2am. |
| Docker Compose scope | Postgres + Redis only, for now | Nothing else has real logic to containerize yet; adding `api`/`worker`/`web` services to Compose before they do anything would be empty scaffolding, which the project rules explicitly disallow. |
| Web tooling | Vite + React + TS + Tailwind, real (if minimal) render | Tooling setup is legitimately Phase 1 scope even though the dashboard itself isn't; this proves the frontend build pipeline works before Phase 18 depends on it. |

## 5. Alternatives considered

- **Nx or Turborepo** — rejected for now: adds a caching/build-graph abstraction whose value only shows up with more packages/apps than we currently have; plain `pnpm -r` is transparent and sufficient at this size.
- **npm or Yarn workspaces** — pnpm chosen for stricter node_modules (catches accidental undeclared-dependency usage early, which matters once Clean Architecture boundaries are enforced).
- **TypeScript project references** across the whole repo — deferred; only `apps/web` uses a reference (required by Vite's node/browser split). Full project references add build-order complexity that isn't paying for itself yet with two small shared packages.
- **Legacy `.eslintrc` format** — flat config (`eslint.config.js`) chosen since it's the current ESLint direction and avoids starting the project on a format already being phased out.

## 6. Code delivered this phase

```
RelayHub/
├── package.json, pnpm-workspace.yaml, tsconfig.base.json
├── eslint.config.js, .prettierrc, .prettierignore, .gitignore, .nvmrc
├── .env.example, docker-compose.yml, README.md
├── .github/workflows/ci.yml
├── apps/
│   ├── api/        (Express + Helmet + CORS + Pino + Zod env + /healthz)
│   ├── worker/      (Express health server only; queue processors → Phase 7)
│   └── web/         (Vite + React + TS + Tailwind, dark-mode shell)
├── packages/
│   ├── shared-config/  (baseEnvSchema, parseEnv)
│   └── shared-types/   (HealthCheckResponse contract)
└── docs/
    ├── architecture/RelayHub-Architecture.md
    └── phases/phase-1-monorepo-tooling.md   (this file)
```

## 7. Tests included

- `apps/api/test/health.test.ts` — Supertest: `/healthz` returns 200 with the correct shape, Helmet security headers are present, unknown routes 404.
- `apps/worker/test/health.test.ts` — Supertest: worker's `/healthz` returns 200 with the correct shape.

Both use `pino({ level: "silent" })` in tests to avoid log noise in CI while still exercising the real `pino-http` middleware wiring — not mocked out.

## 8. API documentation

No OpenAPI/Swagger yet — there's exactly one trivial endpoint per service and no business-relevant contract to document. Swagger setup begins in **Phase 6** when the ingestion endpoint (the first real API surface) is built, and will retroactively document `/healthz` at that point too.

## 9. How to run this locally (in `E:\RelayHub`)

```bash
# from E:\RelayHub
nvm use                      # or ensure Node 20.x is active
corepack enable
corepack prepare pnpm@9.7.0 --activate

pnpm install
cp .env.example .env

docker compose up -d         # starts Postgres + Redis (unused by app code yet, but validates Compose)

pnpm dev:api                 # → http://localhost:4000/healthz
pnpm dev:worker              # → http://localhost:4100/healthz   (separate terminal)
pnpm dev:web                 # → http://localhost:5173           (separate terminal)
```

> Note: I generated and validated this scaffold in a sandboxed environment without outbound network access, so I could not run `pnpm install` here to execute a live build. I did validate every `package.json`/`tsconfig.json` for JSON correctness. Please run the commands above on your machine and paste me any error output if `pnpm install` or the dev servers surface one — I'll fix it before we move to Phase 2.

## 10. How to verify it works

1. `pnpm lint` — should exit 0.
2. `pnpm typecheck` — should exit 0.
3. `pnpm test` — both `health.test.ts` suites should pass (3 assertions in api, 1 in worker).
4. `pnpm dev:api`, then `curl http://localhost:4000/healthz` → JSON with `"status":"ok"`, `"service":"relayhub-api"`.
5. `pnpm dev:worker`, then `curl http://localhost:4100/healthz` → JSON with `"service":"relayhub-worker"`.
6. `pnpm dev:web`, open `http://localhost:5173` → dark-mode "RelayHub" shell renders.
7. `docker compose up -d` then `docker compose ps` → `relayhub-postgres` and `relayhub-redis` both `healthy`.
8. Push to a branch / open a PR → GitHub Actions `CI` workflow runs lint, typecheck, test, build, all green.

## 11. Interview questions this phase prepares you for

- "Why separate the API and worker into different processes instead of running BullMQ workers in-process with Express?"
- "Walk me through what happens if `DATABASE_URL` is missing when the API boots — why fail at startup instead of on first query?"
- "Why pnpm over npm/yarn for a monorepo this size, and what would make you reach for Nx or Turborepo instead?"
- "What's the difference between your `/healthz` and the `/readyz` you've deferred — why not implement both now?"
- "Why validate environment variables with Zod instead of just reading `process.env.X` directly where needed?"
- "What would break if two developers added conflicting Prettier configs to different workspaces — how does this setup prevent that?"

## 12. Approval checkpoint

Phase 1 is complete and self-contained: no application/domain logic has been written yet (correctly — there isn't any at this stage). Once you've run the verification steps above and they pass on your machine, confirm and I'll start **Phase 2: Database Layer** (full Prisma schema from Section 11, migrations, seed script, and repository interfaces).
