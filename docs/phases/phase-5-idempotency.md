# Phase 5: Idempotency & Fast Path

## Goal
Implement a Redis-backed fast path for idempotency checks. This ensures that if the same webhook is received twice (e.g. due to a network retry), the system rejects the duplicate before it even hits the database or queue.

## Implementation Details

1. **Redis Setup:**
   - Instantiated an `ioredis` client in the API server.

2. **IdempotencyService:**
   - Implemented `IdempotencyService` port and its adapter using Redis.
   - The service uses the `SETNX` (Set if Not eXists) command to atomically check and lock a unique idempotency key.
   - The key is derived from the `SourceId` and the user-provided `Idempotency-Key` header.
   - Configured a TTL (Time To Live) on the lock (e.g. 24 hours).

## Verification
- Validated via `pnpm typecheck`.
- Manual verification using Redis CLI to ensure locks are created and respected.
