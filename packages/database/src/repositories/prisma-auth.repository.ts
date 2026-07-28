import type { PrismaClient } from "@prisma/client";
import type { UserRepository, ApiKeyRepository, User, UserId, ApiKey, ApiKeyId, EnvironmentId } from "@relayhub/domain";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { email: string; passwordHash: string; name: string }): Promise<User> {
    return this.prisma.user.create({ data: input });
  }

  async findById(id: UserId): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async softDelete(id: UserId): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { environmentId: EnvironmentId; prefix: string; secretHash: string; name: string }): Promise<ApiKey> {
    return this.prisma.apiKey.create({ data: input });
  }

  async findById(id: ApiKeyId): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({ where: { id } });
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({ where: { prefix } });
  }

  async listByEnvironment(environmentId: EnvironmentId): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({ where: { environmentId }, orderBy: { createdAt: "asc" } });
  }

  async revoke(id: ApiKeyId): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
