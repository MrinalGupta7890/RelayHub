import { loadWorkerEnv } from "./config/env";
import { createLogger } from "./logger";
import { createHealthServer } from "./health-server";
import { getPrismaClient, checkDatabaseConnection, PrismaEventRepository, PrismaSourceRepository, PrismaDestinationRepository, PrismaDeliveryAttemptRepository } from "@relayhub/database";
import Redis from "ioredis";
import { BullMqQueueService } from "./infrastructure/queue/bullmq/BullMqQueueService";
import { EventFanoutUseCase } from "./application/use-cases/fanout/EventFanoutUseCase";
import { ExecuteDeliveryUseCase } from "./application/use-cases/delivery/ExecuteDeliveryUseCase";
import { FanoutWorker } from "./infrastructure/queue/bullmq/FanoutWorker";
import { DeliveryWorker } from "./infrastructure/queue/bullmq/DeliveryWorker";
import { FetchHttpDeliveryService } from "./infrastructure/http/FetchHttpDeliveryService";
import { AesEncryptionService } from "./infrastructure/crypto/AesEncryptionService";

const env = loadWorkerEnv();
const logger = createLogger(env);

const prisma = getPrismaClient({ logQueries: env.NODE_ENV === "development" });
const redis = new Redis(env.REDIS_URL);

// Repositories
const eventRepository = new PrismaEventRepository(prisma);
const sourceRepository = new PrismaSourceRepository(prisma);
const destinationRepository = new PrismaDestinationRepository(prisma);
const deliveryAttemptRepository = new PrismaDeliveryAttemptRepository(prisma);

// Infrastructure Services
const queueService = new BullMqQueueService(redis);
const httpDeliveryService = new FetchHttpDeliveryService();
const encryptionService = new AesEncryptionService(env.ENCRYPTION_MASTER_KEY);

// Use Cases
const eventFanoutUseCase = new EventFanoutUseCase(
  eventRepository,
  sourceRepository,
  destinationRepository,
  deliveryAttemptRepository,
  queueService
);

const executeDeliveryUseCase = new ExecuteDeliveryUseCase(
  deliveryAttemptRepository,
  eventRepository,
  destinationRepository,
  httpDeliveryService,
  encryptionService,
  logger
);

// Workers
const fanoutWorker = new FanoutWorker(redis, eventFanoutUseCase, logger);
const deliveryWorker = new DeliveryWorker(redis, executeDeliveryUseCase, logger);

logger.info({ queues: ["ingestion.fanout", "delivery.retry"] }, "Workers started");

// Start health server
const healthApp = createHealthServer(logger, {
  checkDatabase: () => checkDatabaseConnection(prisma),
});

const server = healthApp.listen(env.WORKER_PORT, () => {
  logger.info({ port: env.WORKER_PORT }, "RelayHub Worker health server listening");
});

let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Worker shutting down...");

  await fanoutWorker.close();
  await deliveryWorker.close();
  await redis.quit();

  server.close(async () => {
    logger.info("Health server closed");
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
