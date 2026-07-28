import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { ExecuteDeliveryUseCase } from "../../../application/use-cases/delivery/ExecuteDeliveryUseCase";
import { Logger } from "pino";

export class DeliveryWorker {
  private worker: Worker;

  constructor(
    private readonly redisConnection: Redis,
    private readonly executeDeliveryUseCase: ExecuteDeliveryUseCase,
    private readonly logger: Logger
  ) {
    this.worker = new Worker(
      "delivery.retry",
      async (job: Job) => {
        const { deliveryAttemptId } = job.data;
        this.logger.info({ deliveryAttemptId }, "Processing delivery job");
        await this.executeDeliveryUseCase.execute(deliveryAttemptId);
      },
      {
        connection: this.redisConnection,
        concurrency: 10,
      }
    );

    this.worker.on("completed", (job) => {
      this.logger.info({ jobId: job.id, attemptId: job.data.deliveryAttemptId }, "Delivery job completed successfully");
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error({ jobId: job?.id, attemptId: job?.data.deliveryAttemptId, err: err.message }, "Delivery job failed");
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
