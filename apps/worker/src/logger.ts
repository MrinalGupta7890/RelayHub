import pino from "pino";
import type { WorkerEnv } from "./config/env";

export function createLogger(env: WorkerEnv) {
  return pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
        : { target: "pino/file", options: { destination: 1 } },
  });
}
