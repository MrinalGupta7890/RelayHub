import type { PrismaClient } from "@prisma/client";

/**
 * Backs the /readyz endpoints in both the API and Worker services. A plain
 * `SELECT 1` is enough to prove the connection pool can actually reach
 * Postgres — cheaper and more reliable than querying a real table, and it
 * still requires a live round trip so it can't lie about connectivity.
 */
export async function checkDatabaseConnection(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
