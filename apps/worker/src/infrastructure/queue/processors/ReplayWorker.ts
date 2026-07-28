import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { Logger } from "pino";
import { ExecuteReplayUseCase } from "../../../application/use-cases/replay/ExecuteReplayUseCase";

export class ReplayWorker {
  private worker: Worker;

  constructor(
    private readonly redisConnection: Redis,
    private readonly executeReplayUseCase: ExecuteReplayUseCase,
    private readonly logger: Logger
  ) {
    this.worker = new Worker(
      "replay",
      async (job: Job) => {
        const { eventId, destinationId } = job.data;
        if (!eventId) {
          throw new Error("Job missing eventId");
        }
        
        await this.executeReplayUseCase.execute(eventId, destinationId);
      },
      {
        connection: this.redisConnection,
        concurrency: 5, 
      }
    );

    this.worker.on("completed", (job) => {
      this.logger.debug({ jobId: job.id }, "Replay job completed successfully");
    });

    this.worker.on("failed", (job, err) => {
      this.logger.error({ jobId: job?.id, error: err.message }, "Replay job failed");
    });
  }

  async close() {
    await this.worker.close();
  }
}
