import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  EventRepository,
  DeliveryAttemptRepository,
  Event,
  EventId,
  DeliveryAttempt,
  DeliveryAttemptId,
  DeliveryStatus,
  SourceId,
  DestinationId,
  CursorPage,
  CursorPageParams,
} from "@relayhub/domain";
import { cast } from "../mappers";

/**
 * Shared cursor-pagination helper: fetches `limit + 1` rows ordered by `id`
 * (cuid()s are lexicographically sortable by creation order in Prisma's
 * default btree index), and uses the extra row to determine `nextCursor`
 * without a separate COUNT query.
 */
async function paginate<T extends { id: string }>(
  fetch: (args: { take: number; cursor?: { id: string }; skip?: number }) => Promise<T[]>,
  params: CursorPageParams,
): Promise<CursorPage<T>> {
  const take = params.limit + 1;
  const records = await fetch({
    take,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = records.length > params.limit;
  const items = hasMore ? records.slice(0, params.limit) : records;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return { items, nextCursor };
}

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    sourceId: SourceId;
    eventType: string;
    idempotencyKey: string;
    payload: unknown;
    headers: Record<string, string>;
    correlationId: string;
  }): Promise<Event> {
    const record = await this.prisma.event.create({
      data: {
        ...input,
        payload: input.payload as Prisma.InputJsonValue,
        headers: input.headers as Prisma.InputJsonValue,
      },
    });
    return cast<Event>(record);
  }

  async findById(id: EventId): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? cast<Event>(record) : null;
  }

  async findBySourceAndIdempotencyKey(sourceId: SourceId, idempotencyKey: string): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({
      where: { sourceId_idempotencyKey: { sourceId, idempotencyKey } },
    });
    return record ? cast<Event>(record) : null;
  }

  async listBySource(sourceId: SourceId, params: CursorPageParams): Promise<CursorPage<Event>> {
    const page = await paginate(
      (args) => this.prisma.event.findMany({ where: { sourceId }, orderBy: { id: "asc" }, ...args }),
      params,
    );
    return cast<CursorPage<Event>>(page);
  }
}

export class PrismaDeliveryAttemptRepository implements DeliveryAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    eventId: EventId;
    destinationId: DestinationId;
    attemptNumber: number;
    status: DeliveryStatus;
    scheduledAt: Date;
  }): Promise<DeliveryAttempt> {
    const record = await this.prisma.deliveryAttempt.create({
      data: { ...input, status: cast(input.status) },
    });
    return cast<DeliveryAttempt>(record);
  }

  async findById(id: DeliveryAttemptId): Promise<DeliveryAttempt | null> {
    const record = await this.prisma.deliveryAttempt.findUnique({ where: { id } });
    return record ? cast<DeliveryAttempt>(record) : null;
  }

  async updateStatus(
    id: DeliveryAttemptId,
    changes: Partial<
      Pick<
        DeliveryAttempt,
        "status" | "requestSnapshot" | "responseStatus" | "responseBody" | "errorMessage" | "durationMs" | "completedAt"
      >
    >,
  ): Promise<DeliveryAttempt> {
    const record = await this.prisma.deliveryAttempt.update({
      where: { id },
      data: cast<Prisma.DeliveryAttemptUpdateInput>(changes),
    });
    return cast<DeliveryAttempt>(record);
  }

  async listByEvent(eventId: EventId): Promise<DeliveryAttempt[]> {
    const records = await this.prisma.deliveryAttempt.findMany({
      where: { eventId },
      orderBy: { attemptNumber: "asc" },
    });
    return cast<DeliveryAttempt[]>(records);
  }

  async listByDestination(destinationId: DestinationId, params: CursorPageParams): Promise<CursorPage<DeliveryAttempt>> {
    const page = await paginate(
      (args) => this.prisma.deliveryAttempt.findMany({ where: { destinationId }, orderBy: { id: "asc" }, ...args }),
      params,
    );
    return cast<CursorPage<DeliveryAttempt>>(page);
  }

  async listByStatus(
    destinationId: DestinationId,
    status: DeliveryStatus,
    params: CursorPageParams,
  ): Promise<CursorPage<DeliveryAttempt>> {
    const page = await paginate(
      (args) =>
        this.prisma.deliveryAttempt.findMany({
          where: { destinationId, status: cast(status) },
          orderBy: { id: "asc" },
          ...args,
        }),
      params,
    );
    return cast<CursorPage<DeliveryAttempt>>(page);
  }
}
