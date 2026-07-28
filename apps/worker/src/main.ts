import { getPrismaClient, disconnectPrisma, checkDatabaseConnection } from "@relayhub/database";
import { loadWorkerEnv } from "./config/env";
import { createLogger } from "./logger";
import { createHealthServer } from "./health-server";

const env = loadWorkerEnv();
const logger = createLogger(env);
const prisma = getPrismaClient({ logQueries: env.NODE_ENV === "development" });

const healthApp = createHealthServer(logger, {
  checkDatabase: () => checkDatabaseConnection(prisma),
});

const server = healthApp.listen(env.WORKER_PORT, () => {
  logger.info(
    { port: env.WORKER_PORT, env: env.NODE_ENV },
    "RelayHub Worker health server listening (queue processors arrive in Phase 7)",
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(async () => {
    await disconnectPrisma();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
