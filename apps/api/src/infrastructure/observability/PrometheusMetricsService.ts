import { MetricsService } from "@relayhub/domain";
import { Counter, Histogram } from "prom-client";

export class PrometheusMetricsService implements MetricsService {
  private ingestedEventsCounter: Counter<"environmentId">;
  private deliveryAttemptCounter: Counter<"status" | "destinationId">;
  private deliveryLatencyHistogram: Histogram<"destinationId">;

  constructor() {
    this.ingestedEventsCounter = new Counter({
      name: "relayhub_events_ingested_total",
      help: "Total number of events ingested",
      labelNames: ["environmentId"],
    });

    this.deliveryAttemptCounter = new Counter({
      name: "relayhub_delivery_attempts_total",
      help: "Total number of delivery attempts",
      labelNames: ["status", "destinationId"],
    });

    this.deliveryLatencyHistogram = new Histogram({
      name: "relayhub_delivery_latency_seconds",
      help: "Latency of delivery attempts in seconds",
      labelNames: ["destinationId"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });
  }

  incrementEventsIngested(environmentId: string): void {
    this.ingestedEventsCounter.inc({ environmentId });
  }

  incrementDeliveryAttempt(status: string, destinationId: string): void {
    this.deliveryAttemptCounter.inc({ status, destinationId });
  }

  recordDeliveryLatency(latencyMs: number, destinationId: string): void {
    this.deliveryLatencyHistogram.observe({ destinationId }, latencyMs / 1000);
  }
}
