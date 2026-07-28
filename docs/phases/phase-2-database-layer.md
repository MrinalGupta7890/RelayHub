# Phase 2 — Database Layer

## 1. What we're building

The full persistence layer: the Prisma schema (Section 11 of the architecture doc, unchanged), a `@relayhub/domain` package holding pure-TypeScript entities and repository **interfaces**, a `@relayhub/database` package holding the Prisma schema itself and the repository **implementations**, a seed script for the tenancy structure, and `/readyz` endpoints on both `api` and `worker` that now do a real database connectivity check instead of the placeholder they were deferred to.

## 2. Why it's needed

Every phase from here on (Auth, Organizations, Sources, Destinations, Ingestion, Delivery, Replay) reads and writes these same eleven tables. Getting the schema, indexes, and repository contracts right once — with both services (`api`, `worker`) sharing one canonical definition of what an `Event` or `DeliveryAttempt` *is* — avoids the exact kind of drift and duplicated business logic the project rules explicitly forbid.

## 3. Where it fits in the architecture

Implements **Section 11 (Database Schema)** verbatim, and **Section 8/9 (Clean Architecture Layers / Domain Model)** for the persistence side of the Infrastructure and Domain layers. The repository interfaces defined here are the exact **ports** that Application-layer use-cases (starting Phase 3) will depend on — never on Prisma types directly.

## 4. Design decisions

| Decision | Choice | Why |
|---|---|---|
| Domain package scope | New `@relayhub/domain` package: pure entities + repository interfaces, zero framework imports | Both `api` and `worker` need identical definitions of `Event`, `DeliveryAttempt`, `Destination`, etc. Duplicating them per-app (as the original Section 7 sketch implied, with `domain/` nested inside each app) would violate the project's own "DO NOT duplicate business logic" rule the moment Phase 9's worker needs the same `DeliveryStatus` state machine the API's dashboard queries read. **This is a documented deviation from the original per-app folder sketch in Section 7**, made explicit here per the project rules. Application-layer *use-cases* (`IngestEventUseCase`, etc.) still live separately per app in later phases — those genuinely differ per service. |
| Database package scope | New `@relayhub/database` package: Prisma schema + generated client + Prisma-backed repository implementations of the domain interfaces | Keeps Prisma itself — a concrete infrastructure dependency — out of both `api` and `worker`'s own source trees; each app only imports the repository classes and a `getPrismaClient()` singleton, never `@prisma/client` types directly in application code. |
| ID strategy | `cuid()` | Sortable-enough for cursor pagination by creation order without exposing sequential integer IDs (which leak record counts and enable enumeration — relevant for a multi-tenant system where `id` values are used in URLs). |
| Soft deletes | `deletedAt: DateTime?` on `User`, `Organization`, `Project`, `Source`, `Destination`; hard rows kept, repository read methods filter `deletedAt: null` | Per Section 11. `Event` and `DeliveryAttempt` are intentionally **not** soft-deletable — they're immutable historical records by domain invariant (Section 9); there's no "delete an event" operation in this system at all. |
| Table naming | Prisma models PascalCase singular, mapped via `@@map`/`@map` to snake_case plural tables/columns | Prisma model ergonomics in TypeScript, conventional readable SQL for anyone inspecting the database directly (or for the eventual Grafana/Prometheus SQL exporters in Phase 15). |
| Enum boundary | A single `cast<T>()` helper in `@relayhub/database/src/mappers.ts`, used only at the repository layer | TypeScript string enums are nominally typed — `@relayhub/domain`'s `Role` and Prisma's generated `Role` enum have identical runtime values but are NOT mutually assignable at compile time. Rather than scatter `as any` throughout repository code, one narrow, well-commented cast function isolates every occurrence of this specific, known-safe boundary crossing. This is a real, common friction point when combining Prisma with a DDD-style domain layer — worth knowing for the interview questions below. |
| Pagination | Cursor-based (`id`-ordered), shared `paginate()` helper in the events repository file | Matches Section 20's explicit choice — offset pagination degrades under the Event/DeliveryAttempt insert rate this system is designed for. |
| Seed scope | Organization → Project → Environment (live, test) only — no Users, ApiKeys, Sources, or Destinations yet | Seeding credentials/secrets before Phase 3 (Auth) and Phase 6 (Sources, which owns secret encryption) exists would mean inventing security-relevant logic ahead of the phase that actually owns it. The seed script is extended incrementally as each phase lands. |
| `/readyz` | Now implemented for real in both `api` and `worker`, checking `SELECT 1` against Postgres via `checkDatabaseConnection()` | This was explicitly deferred in Phase 1 rather than stubbed to always return `true` — Phase 2 is the first point a real dependency exists to check, so it's implemented now, correctly, instead of being a lie in the health payload. |

## 5. Alternatives considered

- **Domain entities/interfaces duplicated inside `apps/api/src/domain` and `apps/worker/src/domain`** (matching the original Section 7 sketch literally) — rejected: guarantees drift the first time one service's copy of `DeliveryStatus` gets a new value and the other doesn't.
- **Repository interfaces skipped, services call Prisma directly** — rejected: this is exactly the "business logic in infrastructure, no seam for testing" anti-pattern Clean Architecture (Section 6/8) exists to prevent; use-cases in later phases would become untestable without a real database.
- **Offset-based pagination (`skip`/`take` by page number)** — rejected per Section 20's own reasoning: unstable under concurrent inserts, which is the normal operating condition for the `Event` table.
- **Prisma's `zod-prisma-types` or similar codegen to avoid the domain/Prisma enum mismatch entirely** — considered, but adds a codegen step and a third source of truth (generated Zod from Prisma schema) for something a five-line, well-documented cast function solves directly. Revisit if the enum surface grows significantly.
- **Storing `retryPolicy`/`customHeaders` as separate normalized tables instead of `Json` columns** — rejected for v1: these are per-Destination configuration blobs read as a whole, never queried by their internal fields; normalizing them adds join complexity with no query benefit at this stage.

## 6. Code delivered this phase

```
packages/
├── domain/                          (@relayhub/domain — new)
│   └── src/
│       ├── entities/                (common, tenancy, auth, webhooks, events, audit)
│       └── repositories/            (interfaces + pagination contract)
│
└── database/                        (@relayhub/database — new)
    ├── prisma/
    │   ├── schema.prisma             (full schema, Section 11)
    │   └── seed.ts
    ├── src/
    │   ├── client.ts                 (PrismaClient singleton)
    │   ├── health.ts                 (checkDatabaseConnection)
    │   ├── mappers.ts                (enum/JSON boundary cast helper)
    │   └── repositories/             (5 files, 11 Prisma-backed repository classes)
    └── test/
        └── tenancy.integration.test.ts

apps/api/     — DATABASE_URL added to env schema, /readyz wired to real DB check
apps/worker/  — same as above
```

## 7. Tests included

- `packages/database/test/tenancy.integration.test.ts` — **real Postgres integration tests** (not mocked): organization creation/lookup, project listing, unique-constraint enforcement on `(projectId, name)` for environments, soft-delete behavior (row persists, read methods correctly filter it out), and membership uniqueness per `(userId, organizationId)`.
- `apps/api/test/health.test.ts` — extended with `/readyz` cases: 200 when DB check passes, 503 when it fails (using the newly injectable `checkDatabase` dependency, no real DB needed for this test).
- `apps/worker/test/health.test.ts` — same `/readyz` coverage for the worker.

## 8. API documentation

Still no Swagger — `/readyz` is infrastructure, not a documented business endpoint, and no new business-facing routes were added this phase. Swagger setup begins in Phase 6 as planned.

## 9. How to run this locally

```bash
# from E:\RelayHub, after merging this phase's files in
pnpm install

docker compose up -d              # Postgres + Redis
cp .env.example .env              # if not already done in Phase 1

pnpm db:generate                  # generates the Prisma client
pnpm db:migrate:dev                # creates the initial migration AND applies it
                                    # — you'll be prompted for a migration name; use "init"
pnpm db:seed                       # seeds Acme Inc / Default Project / live + test envs

pnpm dev:api                       # http://localhost:4000/readyz
pnpm dev:worker                    # http://localhost:4100/readyz
```

> Same caveat as Phase 1: I don't have outbound network or a live Postgres in this sandbox, so `pnpm db:migrate:dev` has not been run by me — you'll be the one generating the actual migration SQL, which is also the correct order of operations (Prisma generates migrations from a live schema diff against your database, not from me guessing the SQL by hand). I did verify: every `package.json`/`tsconfig.json` is valid JSON, and every `.ts` file I wrote has balanced brackets/braces as a basic sanity pass. Please run `pnpm db:migrate:dev` and `pnpm test` on your machine and send me any error output.

## 10. How to verify it works

1. `pnpm db:migrate:dev` — creates `packages/database/prisma/migrations/<timestamp>_init/migration.sql` and applies it to your local Postgres. Inspect the generated SQL — it should match the eleven tables in Section 11 (`users`, `organizations`, `memberships`, `projects`, `environments`, `api_keys`, `sources`, `destinations`, `events`, `delivery_attempts`, `audit_log_entries`).
2. `pnpm db:seed` — should print `Seeded organization "acme" with project "Default Project" (live + test environments).`
3. `pnpm db:studio` — opens Prisma Studio; confirm the `Acme Inc` org, `Default Project`, and two environments exist.
4. `pnpm --filter @relayhub/database test` — runs the integration suite against your real local Postgres; all 5 tests should pass, including the two `rejects.toThrow()` constraint-violation cases.
5. `pnpm typecheck` — should exit 0 across all workspaces, including the enum-boundary casts in `@relayhub/database`.
6. `pnpm dev:api`, then `curl http://localhost:4000/readyz` → `{"status":"ok","checks":{"database":"up"}}`. Stop `docker compose` and re-curl → `503` with `"database":"down"`.
7. `pnpm test` at the root — all suites (api, worker, database) green.
8. Push to a branch — CI's `lint-and-build` job should still pass (integration tests remain out of CI for now per Phase 1's note; that gets addressed when we add a Postgres/Redis service-container job — worth deciding now: do you want that added in this phase's CI, or deferred to Phase 3? I left CI unchanged this phase and can go either way).

## 11. Interview questions this phase prepares you for

- "Why put domain entities and repository interfaces in a separate shared package instead of inside each service? What's the tradeoff?"
- "TypeScript string enums vs. string literal unions — why did combining Prisma's generated enums with a hand-written domain enum require an explicit cast, and how would you avoid that friction in a new project?"
- "Walk me through why you chose cursor-based over offset-based pagination for the Event table specifically."
- "Why is `Event` immutable with no soft-delete, while `Organization`/`Project` are soft-deletable?"
- "What does `@@unique([sourceId, idempotencyKey])` actually protect against, and why is it a backstop rather than the primary idempotency mechanism (that's Redis, in Phase 6)?"
- "How does `checkDatabaseConnection` differ in purpose from a normal query, and why `SELECT 1` instead of e.g. counting rows in `organizations`?"
- "If you needed to add a twelfth table next month, walk through every place in this codebase that would need to change."

## 12. Approval checkpoint

Nothing in Phase 3+ has been touched. Run the verification steps above against your local Postgres — in particular `pnpm db:migrate:dev` (which I could not run myself) and the integration test suite. Once green, confirm and I'll start **Phase 3: Auth & RBAC** (register/login/refresh, Argon2 password hashing, JWT issuance, and the `Membership`/`Role` enforcement middleware that every protected route from Phase 4 onward will use).
