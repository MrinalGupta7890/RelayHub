import { Queue } from "bullmq";
import Redis from "ioredis";
import { QueueService, EventId } from "@relayhub/domain";

export class BullMqQueueService implements QueueService {
  private fanoutQueue: Queue;
  private deliveryQueue: Queue;

  constructor(private readonly redisConnection: Redis) {
    this.fanoutQueue = new Queue("ingestion.fanout", {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.deliveryQueue = new Queue("delivery.retry", {
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
        jobId: `fanout:${eventId}`,
      }
    );
  }

  async enqueueDelivery(deliveryAttemptId: string): Promise<void> {
    await this.deliveryQueue.add(
      "deliver",
      { deliveryAttemptId },
      {
        jobId: `deliver:${deliveryAttemptId}`,
      }
    );
  }
}
