import { z } from "zod";
import { baseEnvSchema, parseEnv } from "@relayhub/shared-config";

/**
 * API service environment schema. Extends the shared base schema with
 * only what THIS service needs to boot. DATABASE_URL is now required as of
 * Phase 2 (database layer). REDIS_URL remains deliberately absent until
 * Phase 7 wires up real queue dependencies — adding it now, unused, would
 * be dead config.
 */
const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(4000),
  // Not validated as a strict URL: Postgres connection strings sometimes
  // include query params/socket paths the WHATWG URL parser rejects.
  // Presence + non-empty is the meaningful check at this layer; Prisma
  // itself will reject a malformed value with a clear error at connect time.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return parseEnv(apiEnvSchema, source);
}
