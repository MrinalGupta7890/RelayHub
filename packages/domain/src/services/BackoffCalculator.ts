import { RetryPolicy } from "../entities/webhooks";

export class BackoffCalculator {
  /**
   * Calculates the delay in milliseconds for the next attempt.
   * Uses exponential backoff: baseDelay * 2^(attemptNumber - 1).
   * Includes a random jitter of ±5% to prevent thundering herds.
   * Clamps the final result to maxDelay.
   * 
   * @param attemptNumber The current attempt number that just failed (e.g. 1 for first attempt)
   * @param policy The retry policy defining base and max delays
   */
  public static calculateDelay(attemptNumber: number, policy: RetryPolicy): number {
    // Standard exponential backoff: base * 2^(attempt-1)
    const exponentialFactor = Math.pow(2, attemptNumber - 1);
    let calculatedDelay = policy.baseDelayMs * exponentialFactor;

    // Apply ±5% jitter
    const jitterPercent = (Math.random() * 0.1) - 0.05; // -0.05 to +0.05
    calculatedDelay = calculatedDelay + (calculatedDelay * jitterPercent);

    // Clamp to maxDelay
    return Math.floor(Math.min(calculatedDelay, policy.maxDelayMs));
  }
}
