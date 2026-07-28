import { Queue } from "bullmq";
import Redis from "ioredis";
import { QueueService, EventId } from "@relayhub/domain";

export class BullMqQueueService implements QueueService {
  private fanoutQueue: Queue;

  constructor(private readonly redisConnection: Redis) {
    this.fanoutQueue = new Queue("ingestion.fanout", {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed fanout jobs for inspection
      },
    });
  }

  async enqueueFanout(eventId: EventId): Promise<void> {
    await this.fanoutQueue.add(
      "fanout",
      { eventId },
      {
        jobId: `fanout:${eventId}`, // Idempotent queuing
      }
    );
  }
}
