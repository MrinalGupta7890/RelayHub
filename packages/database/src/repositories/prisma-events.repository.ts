import { PrismaClient } from "@prisma/client";
import { EventRepository, Event, EventId, SourceId, CursorPage, CursorPageParams } from "@relayhub/domain";
import { cast } from "../mappers";

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
    try {
      const record = await this.prisma.event.create({
        data: {
          sourceId: input.sourceId,
          eventType: input.eventType,
          idempotencyKey: input.idempotencyKey,
          payload: input.payload as any,
          headers: input.headers as any,
          correlationId: input.correlationId,
        },
      });
      return cast<Event>(record);
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("DuplicateEvent");
      }
      throw error;
    }
  }

  async findById(id: EventId): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? cast<Event>(record) : null;
  }

  async findBySourceAndIdempotencyKey(sourceId: SourceId, idempotencyKey: string): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({
      where: {
        sourceId_idempotencyKey: {
          sourceId,
          idempotencyKey,
        },
      },
    });
    return record ? cast<Event>(record) : null;
  }

  async listBySource(sourceId: SourceId, params: CursorPageParams): Promise<CursorPage<Event>> {
    const limit = params.limit || 50;
    const records = await this.prisma.event.findMany({
      where: { sourceId },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
      orderBy: { receivedAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records.pop();
      if (nextItem) {
        nextCursor = nextItem.id;
      }
    }

    return {
      items: cast<Event[]>(records),
      nextCursor,
    };
  }
}

import { DeliveryAttemptRepository, DeliveryAttempt, DeliveryAttemptId, DestinationId, DeliveryStatus } from "@relayhub/domain";

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
      data: {
        eventId: input.eventId,
        destinationId: input.destinationId,
        attemptNumber: input.attemptNumber,
        status: input.status,
        scheduledAt: input.scheduledAt,
      },
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
    >
  ): Promise<DeliveryAttempt> {
    const record = await this.prisma.deliveryAttempt.update({
      where: { id },
      data: changes as any,
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
    const limit = params.limit || 50;
    const records = await this.prisma.deliveryAttempt.findMany({
      where: { destinationId },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
      orderBy: { scheduledAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records.pop();
      if (nextItem) {
        nextCursor = nextItem.id;
      }
    }

    return {
      items: cast<DeliveryAttempt[]>(records),
      nextCursor,
    };
  }

  async listByStatus(destinationId: DestinationId, status: DeliveryStatus, params: CursorPageParams): Promise<CursorPage<DeliveryAttempt>> {
    const limit = params.limit || 50;
    const records = await this.prisma.deliveryAttempt.findMany({
      where: { destinationId, status },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
      orderBy: { scheduledAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      const nextItem = records.pop();
      if (nextItem) {
        nextCursor = nextItem.id;
      }
    }

    return {
      items: cast<DeliveryAttempt[]>(records),
      nextCursor,
    };
  }
}

