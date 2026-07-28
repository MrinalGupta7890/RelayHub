/**
 * Shared health-check contract used by every backend service's /healthz
 * endpoint and, later, by the frontend's system-status widget. Kept here
 * so the API and the dashboard can never drift on this shape.
 */
export type ServiceStatus = "ok" | "degraded" | "down";

export interface HealthCheckResponse {
  status: ServiceStatus;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}
