import crypto from "crypto";
import { VerificationType } from "../entities/webhooks";

export class SignatureVerifier {
  public static verify(
    payload: Buffer,
    signatureHeader: string,
    secret: string,
    type: VerificationType
  ): boolean {
    if (type === VerificationType.NONE) {
      return true;
    }

    if (!signatureHeader || !secret) {
      return false;
    }

    let algorithm = "";
    if (type === VerificationType.HMAC_SHA256) {
      algorithm = "sha256";
    } else if (type === VerificationType.HMAC_SHA1) {
      algorithm = "sha1";
    } else {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest("hex");

      // Use timingSafeEqual to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const actualBuffer = Buffer.from(signatureHeader, "utf8");

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (e) {
      return false;
    }
  }
}
