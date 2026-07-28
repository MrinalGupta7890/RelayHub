import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  SourceRepository,
  DestinationRepository,
  Source,
  SourceId,
  Destination,
  DestinationId,
  VerificationType,
  RetryPolicy,
  EnvironmentId,
} from "@relayhub/domain";
import { cast } from "../mappers";

export class PrismaSourceRepository implements SourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    environmentId: EnvironmentId;
    name: string;
    verificationType: VerificationType;
    secretEncrypted: string;
    ingestionSlug: string;
  }): Promise<Source> {
    const record = await this.prisma.source.create({
      data: { ...input, verificationType: cast(input.verificationType) },
    });
    return cast<Source>(record);
  }

  async findById(id: SourceId): Promise<Source | null> {
    const record = await this.prisma.source.findFirst({ where: { id, deletedAt: null } });
    return record ? cast<Source>(record) : null;
  }

  async findByIngestionSlug(slug: string): Promise<Source | null> {
    const record = await this.prisma.source.findFirst({ where: { ingestionSlug: slug, deletedAt: null } });
    return record ? cast<Source>(record) : null;
  }

  async listByEnvironment(environmentId: EnvironmentId): Promise<Source[]> {
    const records = await this.prisma.source.findMany({
      where: { environmentId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return cast<Source[]>(records);
  }

  async softDelete(id: SourceId): Promise<void> {
    await this.prisma.source.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaDestinationRepository implements DestinationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    environmentId: EnvironmentId;
    name: string;
    url: string;
    secretEncrypted: string;
    eventTypeFilters: string[];
    customHeaders: Record<string, string> | null;
    retryPolicy: RetryPolicy;
  }): Promise<Destination> {
    const record = await this.prisma.destination.create({
      data: {
        environmentId: input.environmentId,
        name: input.name,
        url: input.url,
        secretEncrypted: input.secretEncrypted,
        ...(input.customHeaders !== undefined && { customHeaders: input.customHeaders as Prisma.InputJsonValue }),
        retryPolicy: input.retryPolicy as unknown as Prisma.InputJsonValue,
        eventTypeFilters: input.eventTypeFilters,
      },
    });
    return cast<Destination>(record);
  }

  async findById(id: DestinationId): Promise<Destination | null> {
    const record = await this.prisma.destination.findFirst({ where: { id, deletedAt: null } });
    return record ? cast<Destination>(record) : null;
  }

  async listActiveByEnvironment(environmentId: EnvironmentId): Promise<Destination[]> {
    const records = await this.prisma.destination.findMany({
      where: { environmentId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return cast<Destination[]>(records);
  }

  async update(
    id: DestinationId,
    changes: Partial<Pick<Destination, "name" | "url" | "eventTypeFilters" | "customHeaders" | "retryPolicy" | "isActive">>,
  ): Promise<Destination> {
    const record = await this.prisma.destination.update({
      where: { id },
      data: cast<Prisma.DestinationUpdateInput>(changes),
    });
    return cast<Destination>(record);
  }

  async softDelete(id: DestinationId): Promise<void> {
    await this.prisma.destination.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
