export interface MetricsService {
  incrementEventsIngested(environmentId: string): void;
  incrementDeliveryAttempt(status: string, destinationId: string): void;
  recordDeliveryLatency(latencyMs: number, destinationId: string): void;
}
