import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { EventFanoutUseCase } from "../../../application/use-cases/fanout/EventFanoutUseCase";
import { Logger } from "pino";

export class FanoutWorker {
  private worker: Worker;

  constructor(
    private readonly redisConnection: Redis,
    private readonly eventFanoutUseCase: EventFanoutUseCase,
    private readonly logger: Logger
  ) {
    this.worker = new Worker(
      "ingestion.fanout",
      async (job: Job) => {
        const { eventId } = job.data;
        this.logger.info({ eventId }, "Processing fanout job");
        await this.eventFanoutUseCase.execute(eventId);
      },
      {
        connection: this.redisConnection,
        concurrency: 5,
      }
    );

    this.worker.on("completed", (job) => {
      this.logger.info({ jobId: job.id, eventId: job.data.eventId }, "Fanout job completed");
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error({ jobId: job?.id, err }, "Fanout job failed");
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
