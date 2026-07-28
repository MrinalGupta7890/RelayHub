import { EventId } from "../entities";

export interface QueueService {
  /**
   * Enqueues an event for fan-out processing.
   * This corresponds to the `ingestion.fanout` queue.
   */
  enqueueFanout(eventId: EventId): Promise<void>;
}
