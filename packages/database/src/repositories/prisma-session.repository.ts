import type { PrismaClient } from "@prisma/client";
import type { SessionRepository, Session, SessionId, UserId } from "@relayhub/domain";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { userId: UserId; refreshTokenHash: string; expiresAt: Date }): Promise<Session> {
    return this.prisma.session.create({ data: input });
  }

  async findById(id: SessionId): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: { refreshTokenHash },
    });
  }

  async findByUserIdAndTokenHash(userId: UserId, refreshTokenHash: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: { userId, refreshTokenHash },
    });
  }

  async delete(id: SessionId): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async deleteAllForUser(userId: UserId): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
