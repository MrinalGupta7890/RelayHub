import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient factory. A single instance per process is required
 * — Prisma manages its own connection pool internally, and creating a new
 * PrismaClient per request (a common mistake) exhausts Postgres connections
 * under load. Both the API and Worker services import `getPrismaClient()`
 * rather than instantiating PrismaClient directly.
 */
let client: PrismaClient | undefined;

export interface PrismaClientOptions {
  logQueries?: boolean;
}

export function getPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      log: options.logQueries ? ["query", "warn", "error"] : ["warn", "error"],
    });
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
