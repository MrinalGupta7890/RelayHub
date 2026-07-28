import { z } from "zod";
import { baseEnvSchema, parseEnv } from "@relayhub/shared-config";

/**
 * Worker service environment schema. DATABASE_URL is required as of
 * Phase 2 — the worker persists DeliveryAttempts directly. REDIS_URL
 * becomes required starting Phase 7 when BullMQ workers are introduced.
 */
const workerEnvSchema = baseEnvSchema.extend({
  WORKER_PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ENCRYPTION_MASTER_KEY: z.string().min(64, "ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)"),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return parseEnv(workerEnvSchema, source);
}
