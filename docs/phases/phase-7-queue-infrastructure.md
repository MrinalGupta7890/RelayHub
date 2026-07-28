# Phase 7: Queue Infrastructure & Enqueueing

## Goal
Introduce BullMQ to decouple the fast ingestion endpoint from the heavier fan-out and delivery processes.

## Implementation Details

1. **QueueService Port & Adapter:**
   - Defined `QueueService` port with `enqueueFanout` and `enqueueDelivery` methods.
   - Implemented `BullMqQueueService` adapter using BullMQ and Redis.
   - Initialized two distinct queues: `ingestion.fanout` and `delivery.retry`.

2. **Ingestion Integration:**
   - Updated `IngestEventUseCase` to call `QueueService.enqueueFanout(event.id)` immediately after saving the event to the database.
   - The ingestion endpoint now responds with `202 Accepted` as soon as the event is queued, completing the fast ingestion path.

3. **Worker App Skeleton:**
   - Configured the `worker` application workspace.
   - Initialized basic environment config for the worker daemon.

## Verification
- Validated via `pnpm typecheck`.
- Ingested test webhooks and verified they appear in the BullMQ Redis keys.
