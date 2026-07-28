import type { PrismaClient, Prisma } from "@prisma/client";
import type { AuditLogRepository, AuditLogEntry, OrganizationId, UserId, CursorPage, CursorPageParams } from "@relayhub/domain";
import { cast } from "../mappers";

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    organizationId: OrganizationId;
    userId: UserId | null;
    action: string;
    metadata: Record<string, unknown> | null;
  }): Promise<AuditLogEntry> {
    const record = await this.prisma.auditLogEntry.create({
      data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined },
    });
    return cast<AuditLogEntry>(record);
  }

  async listByOrganization(organizationId: OrganizationId, params: CursorPageParams): Promise<CursorPage<AuditLogEntry>> {
    const take = params.limit + 1;
    const records = await this.prisma.auditLogEntry.findMany({
      where: { organizationId },
      orderBy: { id: "asc" },
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = records.length > params.limit;
    const items = hasMore ? records.slice(0, params.limit) : records;
    const nextCursor = hasMore ? items[items.length - 1]!.id : null;

    return cast<CursorPage<AuditLogEntry>>({ items, nextCursor });
  }
}
