import type { User, UserId, ApiKey, ApiKeyId, Session, SessionId } from "../entities";
import type { EnvironmentId } from "../entities";

export interface UserRepository {
  create(input: { email: string; passwordHash: string; name: string }): Promise<User>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  softDelete(id: UserId): Promise<void>;
}

export interface ApiKeyRepository {
  create(input: { environmentId: EnvironmentId; prefix: string; secretHash: string; name: string }): Promise<ApiKey>;
  findById(id: ApiKeyId): Promise<ApiKey | null>;
  findByPrefix(prefix: string): Promise<ApiKey | null>;
  listByEnvironment(environmentId: EnvironmentId): Promise<ApiKey[]>;
  revoke(id: ApiKeyId): Promise<void>;
}

export interface SessionRepository {
  create(input: { userId: UserId; refreshTokenHash: string; expiresAt: Date }): Promise<Session>;
  findById(id: SessionId): Promise<Session | null>;
  findByTokenHash(refreshTokenHash: string): Promise<Session | null>;
  findByUserIdAndTokenHash(userId: UserId, refreshTokenHash: string): Promise<Session | null>;
  delete(id: SessionId): Promise<void>;
  deleteAllForUser(userId: UserId): Promise<void>;
}
