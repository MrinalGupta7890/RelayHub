import { DeliveryStatus } from "../entities";

export interface WsEmitterService {
  /**
   * Emitted when a new event is successfully ingested.
   */
  emitEventIngested(environmentId: string, eventId: string): Promise<void>;

  /**
   * Emitted when a delivery attempt changes status (e.g. queued -> in_progress -> succeeded).
   */
  emitDeliveryUpdated(
    environmentId: string,
    eventId: string,
    deliveryAttemptId: string,
    status: DeliveryStatus
  ): Promise<void>;
}
