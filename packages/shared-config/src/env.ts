import { z } from "zod";

/**
 * Base environment schema shared by every backend service (api, worker).
 * Each service extends this with its own required variables and calls
 * `.parse(process.env)` at boot so misconfiguration fails fast and loudly
 * instead of surfacing as a mysterious runtime error later.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/**
 * Parses `process.env` against a given Zod schema and throws a readable,
 * aggregated error listing every invalid/missing variable at once — rather
 * than failing on the first one, which makes local setup slower to debug.
 */
export function parseEnv<T extends z.ZodTypeAny>(schema: T, source: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}
