import { EventId } from "../entities";

export interface QueueService {
  /**
   * Enqueues an event for fan-out processing.
   * This corresponds to the `ingestion.fanout` queue.
   */
  enqueueFanout(eventId: EventId): Promise<void>;

  /**
   * Enqueues a delivery attempt for processing.
   * This corresponds to the `delivery.retry` queue.
   */
  enqueueDelivery(deliveryAttemptId: string, delayMs?: number): Promise<void>;

  /**
   * Enqueues a replay job for an event and optionally a specific destination.
   * This corresponds to the `replay` queue.
   */
  enqueueReplay(eventId: EventId, destinationId?: string): Promise<void>;
}
