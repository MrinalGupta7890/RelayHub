# RelayHub — Software Architecture Document
### Webhook Orchestrator Platform (Hookdeck / Svix / Stripe-Webhooks class system)

Version 1.0 — Draft for Approval
Author: Principal Architect (Claude)
Project location: `E:\RelayHub`

---

## 0. How to read this document

This document is the single source of truth for RelayHub until superseded by an approved revision. Every phase of implementation must trace back to a section here. If an implementation phase needs to deviate from this document, that deviation must be explicitly called out and justified before code is written — no silent architecture drift.

---

## 1. Project Vision

RelayHub is a multi-tenant **webhook infrastructure platform** that sits between event producers (your services, or third-party providers like Stripe/GitHub/Shopify) and event consumers (your customers' endpoints). It solves the hard, repeatedly-reinvented problems of webhook delivery:

- Ingesting webhooks reliably, even under burst load
- Verifying authenticity (HMAC signatures) and rejecting replays
- Queuing and fanning out to N destinations
- Retrying failed deliveries with backoff, without losing events
- Giving operators visibility (logs, metrics, replay tools) instead of a black box
- Doing all of this per-organization, per-project, per-environment, safely and observably

**Target portfolio narrative:** "I designed and built a production-grade, horizontally scalable webhook delivery platform comparable to Svix/Hookdeck — with real queueing, retry semantics, observability, and multi-tenancy, not a CRUD demo."

**Non-goals (v1):** payments/billing, multi-region active-active, custom plugin marketplace, SDK generation for customer's customers. These are called out explicitly so scope stays achievable.

---

## 2. Functional Requirements

**Tenancy & Identity**
- FR1: Users register/login via email+password (JWT + refresh tokens).
- FR2: A User belongs to one or more Organizations, with a Role per Organization (RBAC).
- FR3: An Organization contains Projects; a Project contains Environments (e.g. `live`, `test`).
- FR4: API Keys are scoped to a Project+Environment, with prefix + secret, hashed at rest.

**Webhook Ingestion (Inbound)**
- FR5: RelayHub exposes a unique ingestion URL per source per environment.
- FR6: Incoming requests are verified (HMAC signature or shared secret depending on source config).
- FR7: Duplicate deliveries (same idempotency/event ID within a window) are detected and deduped.
- FR8: Every accepted request is durably persisted before 200 OK is returned (no in-memory-only acceptance).

**Fan-out & Delivery (Outbound)**
- FR9: An incoming event is matched against one or more Destinations (subscriber endpoints) via topic/event-type filters.
- FR10: Each match creates an independent Delivery Attempt job, queued for outbound delivery.
- FR11: Outbound requests are signed (HMAC) so the receiving customer can verify authenticity.
- FR12: Failed deliveries are retried using a configurable backoff strategy, up to a max attempt count.
- FR13: Exhausted deliveries land in a Dead Letter Queue (DLQ) and are visible in the dashboard.
- FR14: Users can manually or bulk **Replay** events from history or from the DLQ.

**Observability & Operations**
- FR15: Every delivery attempt is logged with request/response/timing/status, queryable and filterable.
- FR16: Real-time dashboard updates via WebSocket (new events, delivery state changes, queue depth).
- FR17: Metrics endpoint (Prometheus format) exposes queue, HTTP, and delivery metrics.
- FR18: Audit log records privileged actions (API key creation, destination changes, replay actions).

**Developer Tools**
- FR19: Webhook Inspector — view raw payload, headers, verification result for any event.
- FR20: Webhook Playground/Simulator — send a synthetic test event through the pipeline.

---

## 3. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Availability | 99.9% target for ingestion API; ingestion must degrade gracefully (queue-backed) rather than fail under destination outages |
| Durability | No accepted event may be lost once a 200 is returned to the sender |
| Scalability | API layer and workers scale horizontally and independently; stateless HTTP layer |
| Latency | Ingestion p95 < 150ms (accept + persist + enqueue only — delivery is async) |
| Security | All secrets hashed/encrypted at rest; signed webhooks both inbound verification and outbound signing; RBAC enforced server-side on every route |
| Multi-tenancy | Strict data isolation by `organizationId` → `projectId` → `environmentId` at the query layer |
| Observability | Every request carries a correlation ID end-to-end (ingress → queue → worker → egress → logs) |
| Maintainability | Clean Architecture boundaries; no business logic in controllers or routes |
| Testability | Every module unit-testable in isolation via dependency injection; integration tests run against ephemeral Dockerized Postgres/Redis |
| Portability | Runs identically in Docker Compose locally and on AWS EC2/ECS |

---

## 4. System Architecture (Overview)

RelayHub is split into four deployable units, all stateless except the data stores:

1. **API Service** (Node/Express) — auth, CRUD for orgs/projects/destinations/api-keys, ingestion endpoint, query endpoints for logs/analytics, WebSocket gateway.
2. **Worker Service** (Node/BullMQ workers) — consumes queues, performs outbound HTTP delivery, handles retry/backoff/DLQ logic, writes delivery logs.
3. **PostgreSQL** — system of record (orgs, projects, destinations, events, delivery attempts, users, audit logs).
4. **Redis** — BullMQ queues/streams, rate-limit counters, idempotency cache, pub/sub for WebSocket fan-out across API instances.

The API Service and Worker Service are **separate processes/containers** from day one (even though both run in Docker Compose locally) so the resume story and the architecture both hold up under "how does this scale" — you scale workers independently of API nodes.

---

## 5. High-Level Architecture Diagram

```
                                   ┌─────────────────────────┐
                                   │      External Sources    │
                                   │ (Stripe, GitHub, Custom)  │
                                   └────────────┬─────────────┘
                                                │ HTTPS POST (signed)
                                                ▼
                    ┌───────────────────────────────────────────────────┐
                    │                    Nginx (TLS, LB)                 │
                    └───────────────────────────┬───────────────────────┘
                                                 ▼
                    ┌───────────────────────────────────────────────────┐
                    │               API Service (stateless, N replicas) │
                    │  Auth │ RBAC │ Ingestion │ CRUD │ WS Gateway       │
                    └───────────┬───────────────────────────┬───────────┘
                                │ writes                      │ pub/sub
                                ▼                              ▼
                    ┌─────────────────────┐        ┌─────────────────────┐
                    │     PostgreSQL       │        │        Redis         │
                    │ (system of record)   │◄──────►│ (queues, cache, PS)  │
                    └─────────────────────┘        └──────────┬──────────┘
                                                                │ BullMQ jobs
                                                                ▼
                    ┌───────────────────────────────────────────────────┐
                    │            Worker Service (stateless, N replicas)  │
                    │  Delivery Workers │ Retry Workers │ DLQ Handler    │
                    └───────────────────────────┬───────────────────────┘
                                                 │ HTTPS POST (signed)
                                                 ▼
                                   ┌─────────────────────────┐
                                   │  Customer Destinations   │
                                   └─────────────────────────┘

                    ┌───────────────────────────────────────────────────┐
                    │   Observability: Prometheus + Grafana + OTel       │
                    │   scrapes /metrics from API + Worker, traces spans │
                    └───────────────────────────────────────────────────┘
```

React dashboard talks to API Service over HTTPS (REST + WebSocket).

---

## 6. Low-Level Architecture (Clean Architecture Layering)

Each backend service (API and Worker) follows the same internal layering, so code moved between them (e.g. a domain rule) doesn't need to change shape:

```
┌───────────────────────────────────────────────────────────┐
│  Presentation Layer                                        │
│  - Express controllers/routes, WS handlers, DTO validation │
│  - Zod schemas at the boundary                              │
├───────────────────────────────────────────────────────────┤
│  Application Layer (Use Cases / Services)                  │
│  - e.g. IngestEventUseCase, RetryDeliveryUseCase            │
│  - Orchestrates domain + repositories, no framework types   │
├───────────────────────────────────────────────────────────┤
│  Domain Layer                                               │
│  - Entities (Event, Delivery, Destination), Value Objects    │
│  - Domain services (SignatureVerifier, BackoffCalculator)   │
│  - Pure TypeScript, zero I/O, zero framework deps            │
├───────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                        │
│  - Prisma repositories implementing domain repo interfaces   │
│  - BullMQ producers/consumers                                │
│  - Redis clients, external HTTP clients                      │
└───────────────────────────────────────────────────────────┘
```

Dependency rule: arrows only point **inward**. Domain never imports Prisma/Express/BullMQ types. Application depends on domain **interfaces**, and infrastructure provides the implementations, wired at startup via a composition root (dependency injection container).

---

## 7. Folder Structure

```
RelayHub/
├── apps/
│   ├── api/                        # API Service
│   │   ├── src/
│   │   │   ├── presentation/
│   │   │   │   ├── http/
│   │   │   │   │   ├── controllers/
│   │   │   │   │   ├── routes/
│   │   │   │   │   ├── middlewares/
│   │   │   │   │   └── validators/       # Zod schemas
│   │   │   │   └── websocket/
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── organizations/
│   │   │   │   │   ├── destinations/
│   │   │   │   │   ├── ingestion/
│   │   │   │   │   └── replay/
│   │   │   │   └── ports/               # repository & service interfaces
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   ├── value-objects/
│   │   │   │   └── services/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/prisma/
│   │   │   │   ├── queue/bullmq/
│   │   │   │   ├── cache/redis/
│   │   │   │   └── observability/
│   │   │   ├── config/
│   │   │   ├── container.ts             # DI composition root
│   │   │   └── server.ts
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── package.json
│   │
│   ├── worker/                      # Worker Service
│   │   ├── src/
│   │   │   ├── application/use-cases/  # DeliverEvent, RetryDelivery, MoveToDLQ
│   │   │   ├── domain/                 # shared concepts, imported via workspace package where truly shared
│   │   │   ├── infrastructure/queue/processors/
│   │   │   └── main.ts
│   │   └── test/
│   │
│   └── web/                         # React Dashboard
│       ├── src/
│       │   ├── app/                 # routing, providers
│       │   ├── features/            # feature-sliced: auth, destinations, logs, analytics
│       │   ├── components/ui/
│       │   ├── lib/                 # api client, socket client
│       │   └── styles/
│       └── test/
│
├── packages/
│   ├── shared-types/                 # DTOs & event contracts shared FE/BE
│   ├── shared-config/                # env schema, constants
│   └── eslint-config/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── worker.Dockerfile
│   │   └── web.Dockerfile
│   ├── nginx/
│   ├── prometheus/
│   └── grafana/
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/workflows/
├── docs/
│   ├── architecture/                 # this document + diagrams
│   └── phases/                       # one doc per implementation phase
└── README.md
```

This is an npm/pnpm workspace monorepo — one repo, three deployable apps, shared type-safe contracts.

---

## 8. Clean Architecture Layers — Responsibilities & Rules

| Layer | May depend on | Must NOT contain |
|---|---|---|
| Presentation | Application | Business rules, direct DB/queue access |
| Application | Domain (interfaces only) | Express/Prisma/BullMQ concrete types |
| Domain | Nothing (pure TS) | I/O, framework imports |
| Infrastructure | Domain interfaces, Application ports | Being imported by Domain |

Enforced in review via a simple rule: **if a file under `domain/` imports from `express`, `@prisma/client`, or `bullmq`, it's a defect.** This will be automated later with an ESLint boundaries rule (Phase 1).

---

## 9. Domain Model

Core entities and their relationships:

- **User** → member of many **Organizations** via **Membership** (with `role`)
- **Organization** → has many **Projects**
- **Project** → has many **Environments** (`live`, `test`, custom)
- **Environment** → has many **ApiKeys**, **Sources**, **Destinations**
- **Source** → represents an inbound webhook origin (e.g. "Stripe Account", "Internal Service A"); owns a verification secret/strategy
- **Destination** → a customer endpoint subscribed to event types, owns delivery config (URL, secret, retry policy override, headers, transform)
- **Event** → an accepted, persisted inbound webhook (immutable payload + metadata)
- **DeliveryAttempt** → one attempt to deliver an Event to a Destination (status, request/response snapshot, attempt number, timestamps)
- **AuditLogEntry** → privileged action record
- **ApiKey** → hashed credential scoped to Environment

Key domain invariants:
- An `Event` is immutable once persisted — retries/replays create new `DeliveryAttempt` rows, never mutate the Event.
- A `DeliveryAttempt` transitions through a strict state machine: `queued → in_progress → (succeeded | failed)`; `failed` may transition to `queued` again (retry) up to `maxAttempts`, after which it becomes `dead_lettered`.
- Replays create a **new** `DeliveryAttempt` chain referencing the original Event — full history is preserved, nothing is overwritten.

---

## 10. Entity-Relationship (ER) Diagram

```
Organization ──1:N── Project ──1:N── Environment
     │                                    │
     │1:N                                 │1:N
     ▼                                    ▼
Membership ──N:1── User            ApiKey
                                          │
                              ┌───────────┼───────────┐
                              │1:N                    │1:N
                              ▼                        ▼
                           Source                 Destination
                              │1:N                     │
                              ▼                        │
                            Event                       │
                              │1:N                      │
                              └──────────► DeliveryAttempt ◄──N:1──┘

AuditLogEntry ──N:1── User
AuditLogEntry ──N:1── Organization
```

---

## 11. Database Schema (PostgreSQL via Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  memberships   Membership[]
  auditLogs     AuditLogEntry[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
}

model Organization {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  memberships Membership[]
  projects    Project[]
  auditLogs   AuditLogEntry[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}

model Membership {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           Role         @default(MEMBER)
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime     @default(now())

  @@unique([userId, organizationId])
  @@index([organizationId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model Project {
  id             String        @id @default(cuid())
  organizationId String
  name           String
  organization   Organization  @relation(fields: [organizationId], references: [id])
  environments   Environment[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedAt      DateTime?

  @@index([organizationId])
}

model Environment {
  id           String        @id @default(cuid())
  projectId    String
  name         String        // "live" | "test" | custom
  project      Project       @relation(fields: [projectId], references: [id])
  apiKeys      ApiKey[]
  sources      Source[]
  destinations Destination[]
  createdAt    DateTime      @default(now())

  @@unique([projectId, name])
}

model ApiKey {
  id            String      @id @default(cuid())
  environmentId String
  prefix        String      @unique   // shown to user, e.g. rlh_live_ab12
  secretHash    String                // bcrypt/argon2 hash of the full secret
  name          String
  revokedAt     DateTime?
  environment   Environment @relation(fields: [environmentId], references: [id])
  createdAt     DateTime    @default(now())

  @@index([environmentId])
}

model Source {
  id                String       @id @default(cuid())
  environmentId     String
  name              String
  verificationType  VerificationType @default(HMAC_SHA256)
  secretEncrypted   String        // AES-256-GCM encrypted at rest
  ingestionSlug     String        @unique   // forms the public ingestion URL
  environment       Environment   @relation(fields: [environmentId], references: [id])
  events            Event[]
  createdAt         DateTime      @default(now())
  deletedAt         DateTime?

  @@index([environmentId])
}

enum VerificationType {
  HMAC_SHA256
  HMAC_SHA1
  NONE
}

model Destination {
  id                String     @id @default(cuid())
  environmentId     String
  name              String
  url               String
  secretEncrypted   String
  eventTypeFilters  String[]           // e.g. ["invoice.*", "user.created"]
  customHeaders     Json?
  retryPolicy       Json               // overrides default backoff config
  isActive          Boolean    @default(true)
  environment       Environment @relation(fields: [environmentId], references: [id])
  attempts          DeliveryAttempt[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  deletedAt         DateTime?

  @@index([environmentId])
}

model Event {
  id              String     @id @default(cuid())
  sourceId        String
  eventType       String
  idempotencyKey  String
  payload         Json
  headers         Json
  correlationId   String
  source          Source     @relation(fields: [sourceId], references: [id])
  attempts        DeliveryAttempt[]
  receivedAt      DateTime   @default(now())

  @@unique([sourceId, idempotencyKey])
  @@index([sourceId, eventType])
  @@index([correlationId])
}

model DeliveryAttempt {
  id             String    @id @default(cuid())
  eventId        String
  destinationId  String
  attemptNumber  Int       @default(1)
  status         DeliveryStatus @default(QUEUED)
  requestSnapshot  Json?
  responseStatus   Int?
  responseBody     String?
  errorMessage     String?
  durationMs       Int?
  event          Event       @relation(fields: [eventId], references: [id])
  destination    Destination @relation(fields: [destinationId], references: [id])
  scheduledAt    DateTime    @default(now())
  completedAt    DateTime?

  @@index([eventId])
  @@index([destinationId, status])
  @@index([status, scheduledAt])
}

enum DeliveryStatus {
  QUEUED
  IN_PROGRESS
  SUCCEEDED
  FAILED
  DEAD_LETTERED
}

model AuditLogEntry {
  id             String    @id @default(cuid())
  organizationId String
  userId         String?
  action         String
  metadata       Json?
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User?        @relation(fields: [userId], references: [id])
  createdAt      DateTime     @default(now())

  @@index([organizationId, createdAt])
}
```

Indexing rationale: `DeliveryAttempt(status, scheduledAt)` supports the DLQ/retry scan; `Event(sourceId, idempotencyKey)` unique constraint gives us idempotency for free at the DB layer as a backstop behind the Redis-based fast-path check.

---

## 12. Queue Architecture (BullMQ / Redis)

Queues, each with distinct concurrency and retry semantics:

| Queue | Purpose | Concurrency | Notes |
|---|---|---|---|
| `ingestion.fanout` | Fan an accepted Event out into per-destination delivery jobs | High | Idempotent producer step |
| `delivery.attempt` | Perform one outbound HTTP delivery attempt | Tunable per deployment | Job carries `deliveryAttemptId` |
| `delivery.retry` | Delayed re-queue of failed attempts | Same as above | Uses BullMQ delayed jobs, backoff computed by domain service |
| `delivery.dlq` | Terminal store for exhausted attempts | N/A (not consumed automatically) | Only touched by explicit Replay action |
| `replay` | Re-processes a chosen Event/DLQ item as a brand-new attempt chain | Moderate | Triggered by user action, supports bulk |

Backoff strategy: exponential with jitter, default `min(2^attempt * baseDelay, maxDelay)`, configurable per Destination via `retryPolicy` JSON, capped at a global max (protects the system from a misconfigured customer setting infinite retries).

---

## 13. Worker Architecture

- Worker Service is a separate Node process (own container), horizontally scalable independent of API.
- Each queue has a dedicated BullMQ `Worker` instance with its own concurrency setting, isolated so a slow `delivery.attempt` backlog doesn't starve `replay` processing.
- Workers use the same Application/Domain layers as the API (via the shared `packages` where the logic is truly shared, or duplicated intentionally where coupling would hurt — documented case by case in the Phase docs).
- Graceful shutdown: on SIGTERM, workers stop accepting new jobs, let in-flight jobs finish (bounded timeout), then exit — required for safe rolling deploys.
- Worker health is exposed via a lightweight `/healthz` HTTP endpoint (separate from the queue-processing loop) for container orchestration liveness checks.

---

## 14. Event Flow (Happy Path)

```
1. External source POSTs signed payload → Ingestion endpoint (API)
2. API verifies signature using Source's secret
3. API checks idempotencyKey against Redis (fast path) then DB unique constraint (safety net)
4. API persists Event row (durable, within a DB transaction)
5. API enqueues ingestion.fanout job (eventId) → returns 200 to source
6. Fanout worker loads Event, matches active Destinations by eventTypeFilters
7. Fanout worker creates DeliveryAttempt rows (status=QUEUED) + enqueues delivery.attempt jobs
8. Delivery worker picks up job, signs outbound payload with Destination secret, POSTs to Destination.url
9. On 2xx → DeliveryAttempt marked SUCCEEDED, logged, WS event emitted to dashboard
10. On non-2xx/timeout → marked FAILED, RetryFlow triggered (see below)
```

---

## 15. Retry Flow

```
DeliveryAttempt FAILED
        │
        ▼
attemptNumber < maxAttempts (from Destination.retryPolicy)?
        │
   ┌────┴────┐
  YES         NO
   │           │
   ▼           ▼
Compute backoff   Mark DEAD_LETTERED
delay via domain  Persist to DLQ view
BackoffCalculator Emit WS "dead-lettered" event
   │
   ▼
Enqueue new DeliveryAttempt (attemptNumber+1)
onto delivery.retry with `delay`
   │
   ▼
Worker picks it up when delay elapses → back to step 8 above
```

---

## 16. Replay Flow

```
User selects Event(s) or DLQ DeliveryAttempt(s) in dashboard → "Replay"
        │
        ▼
API validates permission (RBAC) + records AuditLogEntry("replay_triggered")
        │
        ▼
API enqueues `replay` job(s), referencing original eventId + destinationId
        │
        ▼
Replay worker creates a FRESH DeliveryAttempt (attemptNumber=1, new chain)
        │
        ▼
Proceeds through normal Delivery Flow (step 8 onward)
```
Bulk replay is the same flow batched — the API enqueues one `replay` job per attempt rather than looping synchronously, so a 10,000-item bulk replay doesn't block the request thread.

---

## 17. WebSocket Architecture

- Socket.IO server runs inside the API Service, one namespace per Organization (`/org/:orgId`), authenticated via JWT on connection handshake.
- Because API Service runs as N replicas, Socket.IO uses the **Redis adapter** (pub/sub) so an event emitted from any API instance (or received from a worker via Redis pub/sub) reaches every connected client regardless of which instance they're attached to.
- Workers never hold direct socket connections — they publish domain events (`delivery.succeeded`, `delivery.failed`, `delivery.dead_lettered`) onto a Redis channel; the API layer subscribes and re-emits to the relevant Socket.IO room.
- This keeps the Worker Service fully decoupled from "who's watching the dashboard right now."

---

## 18. Authentication Flow

```
POST /auth/login (email, password)
   → verify bcrypt hash
   → issue Access Token (JWT, short-lived, ~15min) + Refresh Token (opaque, stored hashed in DB, ~30d)
   → Refresh Token set as httpOnly, secure, sameSite cookie
   → Access Token returned in response body (kept in memory client-side, not localStorage)

POST /auth/refresh
   → validate refresh token against DB (hash compare, check revoked/expired)
   → rotate: issue new refresh token, invalidate old one (rotation prevents replay of stolen tokens)
   → issue new access token

API requests
   → Authorization: Bearer <access token>  OR  X-API-Key: <api key> for machine-to-machine/ingestion
```

Passwords hashed with argon2id. Refresh tokens stored as hash, never plaintext, so a DB leak doesn't equal session hijack.

---

## 19. Authorization Flow (RBAC)

- Roles: `OWNER > ADMIN > MEMBER > VIEWER`, scoped per Organization via `Membership`.
- Every protected route declares a required minimum role via middleware: `requireRole('ADMIN')`.
- Resource access additionally checks tenancy: a request scoped to `projectId`/`environmentId` must resolve back to an Organization the authenticated user is a member of — enforced in a single reusable `TenancyGuard` middleware, not re-implemented per controller.
- API Key auth (used for the ingestion endpoint and possibly server-to-server calls) resolves directly to an Environment — no user/session involved, so those routes use a distinct `requireApiKey` middleware rather than JWT RBAC.

---

## 20. API Design

RESTful, versioned from day one: `/api/v1/...`. Highlights:

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:orgId/projects
POST   /api/v1/organizations/:orgId/projects

GET    /api/v1/projects/:projectId/environments
POST   /api/v1/projects/:projectId/environments

POST   /api/v1/environments/:envId/api-keys
DELETE /api/v1/api-keys/:keyId

POST   /api/v1/environments/:envId/sources
GET    /api/v1/environments/:envId/sources
POST   /api/v1/environments/:envId/destinations
GET    /api/v1/environments/:envId/destinations
PATCH  /api/v1/destinations/:destinationId

POST   /ingest/:sourceIngestionSlug        # public, signature-verified, not under /api/v1

GET    /api/v1/environments/:envId/events            # paginated, filterable
GET    /api/v1/events/:eventId
GET    /api/v1/events/:eventId/attempts
GET    /api/v1/destinations/:destinationId/attempts
POST   /api/v1/attempts/:attemptId/replay
POST   /api/v1/events/replay-bulk

GET    /api/v1/environments/:envId/analytics/summary
GET    /metrics                                        # Prometheus scrape
GET    /healthz
GET    /readyz
```

All list endpoints: cursor-based pagination (stable under high insert rate, unlike offset pagination). All mutating endpoints: Zod-validated request bodies, OpenAPI-documented, idempotency-key-aware where relevant.

---

## 21. Frontend Architecture

- **Vite + React + TypeScript**, feature-sliced folder structure (`features/auth`, `features/destinations`, `features/logs`, `features/analytics`).
- **TanStack Query** owns all server state (caching, pagination, invalidation on mutation) — no server data duplicated into a global store.
- **Zustand** (lightweight) for genuinely client-only UI state (sidebar collapsed, active filters) — deliberately not Redux, to avoid boilerplate for a dashboard this size.
- **React Router** for routing, with route-level code splitting.
- **Socket.IO client** wrapped in a single hook (`useRealtimeEvents`) that merges live updates into the TanStack Query cache rather than keeping a parallel source of truth.
- **TailwindCSS** + a small design-token layer for a Stripe/Linear-style dark-mode dashboard (handled in detail during the Frontend phase, using the frontend-design skill for visual quality).
- **Recharts** for analytics visualizations.

---

## 22. State Management Strategy

| State type | Owner | Tool |
|---|---|---|
| Server data (events, destinations, logs) | Backend, cached client-side | TanStack Query |
| Real-time deltas | WebSocket → merged into Query cache | Socket.IO + Query `setQueryData` |
| Auth session | Memory + httpOnly cookie for refresh | React Context (thin) |
| UI-only state | Client | Zustand |
| Form state | Client | React Hook Form + Zod resolver (shared schemas with backend where possible) |

---

## 23. Deployment Architecture

- **Local/dev:** `docker-compose.yml` — api, worker, web, postgres, redis, nginx, prometheus, grafana.
- **Production (initial target: single AWS EC2 host or small ECS cluster):** `docker-compose.prod.yml` behind Nginx doing TLS termination + reverse proxy to API and static frontend build; ECS task definitions provided as a future-ready alternative (documented, not required for v1 grading).
- Each service has its own Dockerfile with a multi-stage build (deps → build → slim runtime image).
- Config via environment variables only, validated at boot with a Zod-based env schema (fail fast on missing/invalid config rather than at first use).

---

## 24. Monitoring Architecture

- **Prometheus** scrapes `/metrics` on API and Worker: HTTP latency/error histograms, queue depth per queue, job processing duration, DB pool stats, delivery success/failure counters by Destination.
- **Grafana** dashboards (provisioned as code in `infra/grafana`) for: API health, Queue health, Delivery success rate, Worker throughput.
- **OpenTelemetry** traces spans across: ingestion request → fanout job → delivery job → outbound HTTP call, tied together via a propagated `correlationId`/trace context, exported to an OTel collector (console/Jaeger locally).

---

## 25. Logging Strategy

- **Pino** structured JSON logging everywhere (no `console.log` in application code).
- Every log line includes `correlationId`, `organizationId`, `environmentId` when available, request id.
- Log levels: `error` (needs attention), `warn` (degraded but handled), `info` (business events: event ingested, delivery succeeded/failed), `debug` (verbose, dev only).
- No PII or secret material (API keys, signing secrets, raw customer payload bodies at `info` level) ever logged in plaintext — payload bodies logged only at `debug` in non-production.

---

## 26. Security Strategy

- Helmet for standard HTTP security headers; CORS locked to configured frontend origin(s).
- express-rate-limit (Redis-backed store, so limits are correct across N API replicas) on auth routes and the public ingestion endpoint.
- HMAC-SHA256 verification of inbound webhooks; constant-time comparison to prevent timing attacks.
- HMAC-SHA256 signing of outbound deliveries with a per-Destination secret + timestamp, so customers can verify authenticity and reject replays on their end (mirroring Stripe's own webhook signature scheme).
- Secrets (Source/Destination signing secrets) encrypted at rest with AES-256-GCM using a KMS-managed or env-provided key, never stored plaintext.
- API keys: only the prefix is stored plaintext (for identification in UI); the secret portion is hashed (argon2) and shown to the user exactly once at creation.
- Input validation via Zod at every controller boundary — this is also the primary SQL-injection/XSS mitigation surface, combined with Prisma's parameterized queries (no raw SQL string concatenation) and React's default output escaping.
- CSRF: not applicable to the Bearer-token JSON API surface; the one cookie-based endpoint (`/auth/refresh`) uses `sameSite=strict` + double-submit consideration, detailed in the Auth phase.

---

## 27. Scaling Strategy

- API Service: stateless, scale horizontally behind Nginx/ALB; session state lives in Redis/DB, never in-process.
- Worker Service: scale by adding replicas; BullMQ concurrency + replica count together define total throughput; queues can be scaled independently (e.g. more `delivery.attempt` workers than `replay` workers).
- PostgreSQL: vertical scaling + read replicas for analytics/log queries (future); write path stays on primary.
- Redis: start single-instance (Docker Compose/local), documented upgrade path to Redis Cluster/managed Redis for production HA — called out as a v1.1 concern, not blocking initial delivery.
- Hot partitioning risk (one very noisy Destination) mitigated by per-destination concurrency caps in the delivery worker, so one bad destination can't starve others.

---

## 28. Disaster Recovery Strategy

- PostgreSQL: automated daily snapshots + WAL archiving (documented for the AWS deployment phase); point-in-time recovery target.
- Redis: treated as **non-durable-by-default** for anything that also exists in Postgres (queue jobs reference DB IDs, so a Redis flush loses in-flight jobs but not historical data); AOF persistence enabled for production to reduce this blast radius.
- Runbook (produced in the deployment phase) for: "Redis lost — how do we re-drive in-flight DeliveryAttempts from DB state," and "Worker fleet down — does the API keep accepting events safely" (yes — ingestion only requires DB + enqueue, not a live worker).

---

## 29. Testing Strategy

| Level | Tool | Scope |
|---|---|---|
| Unit | Jest | Domain services (SignatureVerifier, BackoffCalculator), use-cases with mocked ports |
| Integration | Jest + Supertest + Dockerized Postgres/Redis | Full request → DB → queue round trips per module |
| Queue/Worker | Jest + real BullMQ against test Redis | Job processing, retry transitions, DLQ transitions |
| API contract | Supertest + generated OpenAPI schema validation | Every documented endpoint |
| Load | k6 or autocannon (Phase: Load Testing) | Ingestion endpoint throughput, delivery worker throughput |

Every phase in the build plan ships with its own tests — no module is considered "done" without them, per your stated rules.

---

## 30. CI/CD Pipeline (GitHub Actions)

```
on: push, pull_request
jobs:
  lint        → eslint + tsc --noEmit across all workspaces
  unit-test   → jest unit suites (no external services needed)
  integration → spin up postgres+redis service containers → jest integration suites
  build       → docker build for api/worker/web (build-only validation on PR)
  (main only) → push images to registry → deploy step (documented; manual approval gate for prod)
```
Branch protection requires lint + unit + integration green before merge to `main`.

---

## 31. Milestone-Based Development Plan

This is the execution roadmap. Each phase below will be run through your required 12-step workflow (explain what/why/where/design decisions/alternatives → code → tests → Swagger docs → run instructions → verification → interview questions → wait for approval).

| Phase | Title | Key Deliverable |
|---|---|---|
| 0 | Architecture (this document) | Approved architecture, no code |
| 1 | Monorepo & Tooling Foundation | Workspace setup, TS config, ESLint/Prettier, Docker Compose skeleton (Postgres+Redis only), CI lint/build job |
| 2 | Database Layer | Full Prisma schema, migrations, seed script, repository interfaces |
| 3 | Auth & RBAC | Register/login/refresh, JWT, argon2, Membership/Role enforcement middleware |
| 4 | Organizations, Projects, Environments | CRUD use-cases + controllers + tenancy guard middleware |
| 5 | API Keys | Creation/rotation/revocation, hashing, `requireApiKey` middleware |
| 6 | Sources & Ingestion Endpoint | Public ingestion route, HMAC verification, idempotency, Event persistence |
| 7 | Queue Infrastructure | BullMQ setup, Redis connection management, queue definitions, DI wiring |
| 8 | Destinations & Fan-out | Destination CRUD, event-type matching, fanout worker producing DeliveryAttempts |
| 9 | Delivery Worker | Outbound signed HTTP delivery, success/failure handling, structured logging |
| 10 | Retry Engine | BackoffCalculator domain service, delivery.retry queue, attempt chaining |
| 11 | Dead Letter Queue & Replay | DLQ transition, single + bulk replay endpoints and worker |
| 12 | Delivery Logs & Query API | Filterable/paginated logs endpoints, Webhook Inspector data shape |
| 13 | WebSocket Real-Time Layer | Socket.IO + Redis adapter, event emission from worker → API → client |
| 14 | Audit Logging | AuditLogEntry writes on all privileged actions, query endpoint |
| 15 | Observability | Pino structured logging finalized, Prometheus metrics, OpenTelemetry tracing, health/readiness endpoints |
| 16 | Security Hardening | Rate limiting (Redis-backed), Helmet, circuit breaker for outbound calls, secret encryption finalized |
| 17 | Webhook Playground/Simulator | Synthetic event injection endpoint + UI |
| 18 | Frontend Foundation | Vite/React/Tailwind setup, auth pages, layout shell, API client, design system basics |
| 19 | Frontend Dashboards | Destinations UI, Event/Log explorer with filters, real-time updates, Analytics charts |
| 20 | Testing Completion & Load Testing | Fill any coverage gaps, k6 load test suite, benchmark report |
| 21 | Deployment & Docs | Production Docker Compose, Nginx config, GitHub Actions deploy job, AWS EC2 guide, final README + architecture diagrams export |

This is 22 phases (0–21), inside your requested 15–20 "build" phases if you count Phase 0 as planning-only and merge 20/21 later if you'd rather move faster — your call when we get there.

---

## Approval Checkpoint

Nothing beyond this document exists yet. Please review and confirm before Phase 1 (Monorepo & Tooling Foundation) begins. If you want changes — different queue topology, different frontend state library, different DR posture, phase count — call them out now; this is the cheapest point to change them.
