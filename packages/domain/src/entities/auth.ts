import type { Timestamped, Updatable, SoftDeletable } from "./common";
import type { EnvironmentId } from "./tenancy";

export type UserId = string;
export type ApiKeyId = string;

export interface User extends Updatable, SoftDeletable {
  id: UserId;
  email: string;
  /** Argon2id hash — the domain layer only ever sees the hash, never a
   *  plaintext password. Hashing/verification logic lives in Phase 3's
   *  application layer, not here (domain stays framework/library-free). */
  passwordHash: string;
  name: string;
}

export interface ApiKey extends Timestamped {
  id: ApiKeyId;
  environmentId: EnvironmentId;
  /** Non-secret identifier shown in the UI, e.g. "rlh_live_ab12". */
  prefix: string;
  /** Argon2id hash of the full secret. The plaintext is shown to the user
   *  exactly once at creation time and never persisted. */
  secretHash: string;
  name: string;
  revokedAt: Date | null;
}

export type SessionId = string;

export interface Session {
  id: SessionId;
  userId: UserId;
  refreshTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
