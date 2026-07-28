import crypto from "crypto";

export class SignatureGenerator {
  /**
   * Generates a standard webhook signature header value.
   * Following the industry standard (e.g., Stripe/Svix), the header includes
   * a timestamp and the signature itself: `t=<timestamp>,v1=<signature>`
   *
   * The signature is an HMAC SHA-256 of the concatenated string: `<timestamp>.<payload>`
   */
  public static generate(payload: string, secret: string, timestampMs: number = Date.now()): string {
    const timestamp = Math.floor(timestampMs / 1000).toString();
    const payloadToSign = `${timestamp}.${payload}`;
    
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    return `t=${timestamp},v1=${signature}`;
  }
}
