import type { SourceId, DestinationId } from "./webhooks";

export type EventId = string;
export type DeliveryAttemptId = string;

export interface Event {
  id: EventId;
  sourceId: SourceId;
  eventType: string;
  /** Deduplication key, unique per Source (Section 11: @@unique([sourceId, idempotencyKey])). */
  idempotencyKey: string;
  payload: unknown;
  headers: Record<string, string>;
  correlationId: string;
  receivedAt: Date;
}

/**
 * Strict state machine (Section 9 domain invariants):
 *   QUEUED -> IN_PROGRESS -> (SUCCEEDED | FAILED)
 *   FAILED -> QUEUED            (retry, while attemptNumber < maxAttempts)
 *   FAILED -> DEAD_LETTERED     (attempts exhausted)
 * Transitions are enforced by the Retry Engine (Phase 10), not by this
 * package — the domain layer defines the shape, use-cases enforce the rules.
 */
export enum DeliveryStatus {
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  DEAD_LETTERED = "DEAD_LETTERED",
}

export interface DeliveryAttempt {
  id: DeliveryAttemptId;
  eventId: EventId;
  destinationId: DestinationId;
  attemptNumber: number;
  status: DeliveryStatus;
  requestSnapshot: Record<string, unknown> | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  scheduledAt: Date;
  completedAt: Date | null;
}
