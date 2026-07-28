# Phase 8: Fan-out Worker

## Goal
Build the worker daemon that listens to the `ingestion.fanout` queue, maps incoming events to matching Destinations, and queues up delivery attempts.

## Implementation Details

1. **EventTypeMatcher:**
   - Implemented a domain service to handle Glob pattern matching (e.g. `user.*`, `user.created`).
   - Standard industry wildcard evaluation for event filtering.

2. **EventFanoutUseCase:**
   - Retrieves the `Event` and its `Source`.
   - Fetches all `Destinations` attached to that Source.
   - Filters destinations using the `EventTypeMatcher`.
   - Creates a `DeliveryAttempt` in the database (status `QUEUED`) for each matched Destination.
   - Calls `QueueService.enqueueDelivery(attemptId)` to dispatch them.

3. **FanoutWorker:**
   - Implemented a BullMQ `Worker` daemon running in the `apps/worker` process.
   - Configured with a concurrency of 5.

## Verification
- Validated via `pnpm typecheck`.
- E2E test verifying a single event correctly spawns multiple delivery jobs based on destination filters.
