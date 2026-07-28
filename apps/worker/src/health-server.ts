import express, { type Express, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import type { HealthCheckResponse } from "@relayhub/shared-types";

const SERVICE_NAME = "relayhub-worker";
const SERVICE_VERSION = "0.1.0";
const startedAt = Date.now();

export interface HealthServerDependencies {
  checkDatabase: () => Promise<boolean>;
}

const defaultDeps: HealthServerDependencies = {
  checkDatabase: async () => true,
};

/**
 * The worker's job-processing loop (BullMQ, from Phase 7 onward) is not an
 * HTTP server, so it can't be health-checked the normal way. This tiny,
 * separate Express app exists solely to give container orchestration a
 * liveness/readiness endpoint, per the architecture doc (Section 13: Worker
 * Architecture). It stays deliberately decoupled from job-processing logic.
 */
export function createHealthServer(logger: Logger, deps: HealthServerDependencies = defaultDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(pinoHttp({ logger }));

  app.get("/healthz", (_req: Request, res: Response) => {
    const body: HealthCheckResponse = {
      status: "ok",
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(body);
  });

  // Redis joins this check in Phase 7 once the worker actually depends on
  // it for job processing — added when the dependency becomes real.
  app.get("/readyz", async (_req: Request, res: Response) => {
    const databaseUp = await deps.checkDatabase();

    if (!databaseUp) {
      res.status(503).json({ status: "down", checks: { database: "down" } });
      return;
    }

    res.status(200).json({ status: "ok", checks: { database: "up" } });
  });

  return app;
}
