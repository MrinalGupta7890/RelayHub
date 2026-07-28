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

