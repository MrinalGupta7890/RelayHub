import { Queue } from "bullmq";
import Redis from "ioredis";
import { QueueService, EventId } from "@relayhub/domain";

export class BullMqQueueService implements QueueService {
  private fanoutQueue: Queue;
  private deliveryQueue: Queue;
  private replayQueue: Queue;

  constructor(private readonly redisConnection: Redis) {
    this.fanoutQueue = new Queue("ingestion.fanout", {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed fanout jobs for inspection
      },
    });
    this.deliveryQueue = new Queue("delivery.retry", {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    this.replayQueue = new Queue("replay", {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
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

  async enqueueDelivery(deliveryAttemptId: string, delayMs?: number): Promise<void> {
    await this.deliveryQueue.add(
      "deliver",
      { deliveryAttemptId },
      {
        jobId: `deliver:${deliveryAttemptId}`,
        ...(delayMs !== undefined ? { delay: delayMs } : {}),
      }
    );
  }

  async enqueueReplay(eventId: string, destinationId?: string): Promise<void> {
    await this.replayQueue.add(
      "replay",
      { eventId, destinationId },
      {
        // For deduplication, we can append timestamp or random string if replays shouldn't be deduped, 
        // but typically a manual replay is user-triggered so we don't strictly need a jobId for idempotency here unless we want to prevent double-clicks.
        jobId: `replay:${eventId}:${destinationId || "all"}:${Date.now()}`
      }
    );
  }
}
