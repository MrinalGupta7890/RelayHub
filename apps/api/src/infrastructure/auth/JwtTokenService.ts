import jwt from "jsonwebtoken";
import crypto from "crypto";
import { TokenService } from "@relayhub/domain";

export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string, private readonly expiresIn: string = "15m") {}

  async generateAccessToken(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign({ sub: userId }, this.secret, { expiresIn: this.expiresIn }, (err, token) => {
        if (err || !token) {
          reject(err || new Error("Failed to generate token"));
        } else {
          resolve(token);
        }
      });
    });
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }
}
