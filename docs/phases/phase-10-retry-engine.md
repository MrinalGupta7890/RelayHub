# Phase 10: Retry Engine

## Goal
Implement exponential backoff and attempt chaining so failed webhooks are automatically retried instead of being discarded.

## Implementation Details

1. **BackoffCalculator:**
   - Implemented domain service to calculate delays: `baseDelay * 2^(attempt-1)`.
   - Clamped to `maxDelay`.
   - Injected ±5% randomized jitter to prevent thundering herd scenarios across the infrastructure.

2. **Attempt Chaining:**
   - Modified `ExecuteDeliveryUseCase` failure path.
   - If a request fails and retries are available:
     1. Computes the delay via `BackoffCalculator`.
     2. Creates a *new* `DeliveryAttempt` in the DB with `attemptNumber + 1`.
     3. Calls `QueueService.enqueueDelivery(newAttemptId, delayMs)`.
   - BullMQ natively handles the delay via its `{ delay }` job option.

## Verification
- Validated via `pnpm typecheck`.
- Forced a delivery failure and verified the worker scheduled a subsequent attempt in the future.
