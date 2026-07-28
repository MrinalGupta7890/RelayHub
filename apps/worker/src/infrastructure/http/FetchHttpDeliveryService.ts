import { HttpDeliveryService, DeliveryResult } from "@relayhub/domain";
import CircuitBreaker from "opossum";

export class FetchHttpDeliveryService implements HttpDeliveryService {
  private breakers = new Map<string, CircuitBreaker>();

  private getBreaker(url: string): CircuitBreaker {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch (e) {
      origin = url;
    }

    let breaker = this.breakers.get(origin);
    if (!breaker) {
      const action = async (
        reqUrl: string,
        payloadStr: string,
        headers: Record<string, string>,
        timeoutMs: number
      ) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(reqUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            body: payloadStr,
            signal: controller.signal,
          });

          // Throw on 5xx errors so the circuit breaker records a failure.
          // 4xx errors are client errors and shouldn't trip the circuit.
          if (!response.ok && response.status >= 500) {
            const err = new Error(`HTTP ${response.status}`);
            (err as any).response = response;
            throw err;
          }

          return response;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      breaker = new CircuitBreaker(action, {
        timeout: 15000, // Slightly higher than our max request timeout
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 10,
      });

      this.breakers.set(origin, breaker);
    }

    return breaker;
  }

  async deliver(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    timeoutMs: number = 10000
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    
    const requestSnapshot = {
      url,
      method: "POST",
      headers,
      body: payloadStr,
    };

    const breaker = this.getBreaker(url);

    try {
      const response = await breaker.fire(url, payloadStr, headers, timeoutMs) as Response;
      
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
      const durationMs = Date.now() - startTime;
      let errorMessage = error.message;
      let status = 0;
      let responseBody = "";

      if (error.code === "EOPENBREAKER") {
        errorMessage = `Circuit breaker is open for ${new URL(url).origin}. Failing fast.`;
      } else if (error.name === "AbortError") {
        errorMessage = `Request timed out after ${timeoutMs}ms`;
      }

      // If it was a 5xx error that we intentionally threw in the breaker action
      if (error.response) {
        const response: Response = error.response;
        status = response.status;
        try {
          responseBody = await response.text();
        } catch (e) {
          responseBody = "";
        }
      }

      return {
        status,
        body: responseBody,
        durationMs,
        success: false,
        error: errorMessage,
        requestSnapshot,
      };
    }
  }
}
