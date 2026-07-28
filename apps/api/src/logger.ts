import pino from "pino";
import type { ApiEnv } from "./config/env";

/**
 * Single Pino instance for the whole API service. Pretty-printed in
 * development for readability, raw JSON in production/test so log
 * aggregators (and later, correlation-id-based tracing) get structured
 * output rather than a formatted string to re-parse.
 */
export function createLogger(env: ApiEnv) {
  return pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : { target: "pino/file", options: { destination: 1 } },
  });
}
