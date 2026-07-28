import crypto from "crypto";

export class AesEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 12;
  private readonly delimiter = ":";
  private readonly key: Buffer;

  constructor(masterKeyHex: string) {
    this.key = Buffer.from(masterKeyHex, "hex");
    if (this.key.length !== this.keyLength) {
      throw new Error("Invalid encryption master key length. Must be 32 bytes (64 hex characters).");
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    // Format: iv:authTag:encryptedData
    return [iv.toString("hex"), authTag, encrypted].join(this.delimiter);
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(this.delimiter);
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format");
    }

    const ivHex = parts[0] as string;
    const authTagHex = parts[1] as string;
    const encryptedHex = parts[2] as string;
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
