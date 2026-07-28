import type { Event, EventId, DeliveryAttempt, DeliveryAttemptId, DeliveryStatus } from "../entities";
import type { SourceId, DestinationId } from "../entities";
import type { CursorPage, CursorPageParams } from "./pagination";

export interface EventRepository {
  create(input: {
    sourceId: SourceId;
    eventType: string;
    idempotencyKey: string;
    payload: unknown;
    headers: Record<string, string>;
    correlationId: string;
  }): Promise<Event>;
  findById(id: EventId): Promise<Event | null>;
  /** Backs the idempotency check (Section 14, step 3) — the DB-level
   *  safety net behind the Redis fast path introduced in Phase 6. */
  findBySourceAndIdempotencyKey(sourceId: SourceId, idempotencyKey: string): Promise<Event | null>;
  listBySource(sourceId: SourceId, params: CursorPageParams): Promise<CursorPage<Event>>;
}

export interface DeliveryAttemptRepository {
  create(input: {
    eventId: EventId;
    destinationId: DestinationId;
    attemptNumber: number;
    status: DeliveryStatus;
    scheduledAt: Date;
  }): Promise<DeliveryAttempt>;
  findById(id: DeliveryAttemptId): Promise<DeliveryAttempt | null>;
  updateStatus(
    id: DeliveryAttemptId,
    changes: Partial<
      Pick<
        DeliveryAttempt,
        "status" | "requestSnapshot" | "responseStatus" | "responseBody" | "errorMessage" | "durationMs" | "completedAt"
      >
    >,
  ): Promise<DeliveryAttempt>;
  listByEvent(eventId: EventId): Promise<DeliveryAttempt[]>;
  listByDestination(destinationId: DestinationId, params: CursorPageParams): Promise<CursorPage<DeliveryAttempt>>;
  /** Backs the Dead Letter Queue view (Section 15/11 index on (status, scheduledAt)). */
  listByStatus(destinationId: DestinationId, status: DeliveryStatus, params: CursorPageParams): Promise<CursorPage<DeliveryAttempt>>;
}
