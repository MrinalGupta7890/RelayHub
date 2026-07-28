import * as argon2 from "argon2";
import { PasswordHasher } from "@relayhub/domain";

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (e) {
      return false;
    }
  }
}
