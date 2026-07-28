import { HttpDeliveryService, DeliveryResult } from "@relayhub/domain";

export class FetchHttpDeliveryService implements HttpDeliveryService {
  async deliver(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs: number = 10000
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    
    // We add an AbortController to support timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const requestSnapshot = {
      url,
      method: "POST",
      headers,
      body: payloadStr,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;
      const responseBody = await response.text();
      const success = response.ok;

      return {
        status: response.status,
        body: responseBody,
        durationMs,
        success,
        requestSnapshot,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      
      let errorMessage = error.message;
      if (error.name === "AbortError") {
        errorMessage = `Request timed out after ${timeoutMs}ms`;
      }

      return {
        status: 0,
        body: "",
        durationMs,
        success: false,
        error: errorMessage,
        requestSnapshot,
      };
    }
  }
}
