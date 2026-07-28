export interface DeliveryResult {
  status: number;
  body: string;
  durationMs: number;
  success: boolean;
  error?: string;
  requestSnapshot?: Record<string, unknown>;
}

export interface HttpDeliveryService {
  /**
   * Performs an HTTP POST request to deliver a webhook payload.
   */
  deliver(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs?: number
  ): Promise<DeliveryResult>;
}
