import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import type { HealthCheckResponse } from "@relayhub/shared-types";
import cookieParser from "cookie-parser";
import { createAuthRoutes } from "./presentation/http/routes/auth.routes";
import { AuthController } from "./presentation/http/controllers/AuthController";
import { createOrganizationRoutes } from "./presentation/http/routes/organizations.routes";
import { OrganizationController } from "./presentation/http/controllers/OrganizationController";
import { createProjectRoutes } from "./presentation/http/routes/projects.routes";
import { ProjectController } from "./presentation/http/controllers/ProjectController";
import { createEnvironmentRoutes } from "./presentation/http/routes/environments.routes";
import { EnvironmentController } from "./presentation/http/controllers/EnvironmentController";
import { createApiKeyRoutes } from "./presentation/http/routes/api-keys.routes";
import { ApiKeyController } from "./presentation/http/controllers/ApiKeyController";
import { createSourceRoutes } from "./presentation/http/routes/sources.routes";
import { SourceController } from "./presentation/http/controllers/SourceController";
import { createDestinationRoutes } from "./presentation/http/routes/destinations.routes";
import { DestinationController } from "./presentation/http/controllers/DestinationController";
import { createIngestionRoutes } from "./presentation/http/routes/ingest.routes";
import { IngestionController } from "./presentation/http/controllers/IngestionController";
import { createAnalyticsRoutes } from "./presentation/http/routes/analytics.routes";
import { AnalyticsController } from "./presentation/http/controllers/AnalyticsController";
const SERVICE_NAME = "relayhub-api";
const SERVICE_VERSION = "0.1.0";
const startedAt = Date.now();

export interface AppDependencies {
  /** Injected so tests can simulate DB-down without a real Postgres instance. */
  checkDatabase: () => Promise<boolean>;
  authController?: AuthController;
  organizationController?: OrganizationController;
  projectController?: ProjectController;
  environmentController?: EnvironmentController;
  apiKeyController?: ApiKeyController;
  sourceController?: SourceController;
  destinationController?: DestinationController;
  ingestionController?: IngestionController;
  analyticsController?: AnalyticsController;
}

const defaultDeps: AppDependencies = {
  checkDatabase: async () => true,
};

/**
 * Builds the Express app without starting a listener. Kept separate from
 * server.ts so integration tests can import the app directly (Supertest)
 * without binding a real port — this is the pattern every future
 * controller module will plug into via app.use(...). Dependencies are
 * passed in explicitly (constructor-injection style) rather than imported
 * directly, so this stays testable without a live database.
 */
export function createApp(logger: Logger, deps: AppDependencies = defaultDeps): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  if (deps.authController) {
    app.use("/api/v1/auth", createAuthRoutes(deps.authController));
  }
  
  if (deps.organizationController) {
    app.use("/api/v1/organizations", createOrganizationRoutes(deps.organizationController));
  }

  // The project routes expect /api/v1/organizations/:orgId/projects 
  if (deps.projectController) {
    app.use("/api/v1/organizations/:orgId/projects", createProjectRoutes(deps.projectController));
  }

  if (deps.environmentController) {
    app.use("/api/v1/projects/:projectId/environments", createEnvironmentRoutes(deps.environmentController));
  }

  if (deps.apiKeyController) {
    app.use("/api/v1/environments/:envId/api-keys", createApiKeyRoutes(deps.apiKeyController));
  }

  if (deps.sourceController) {
    app.use("/api/v1/environments/:envId/sources", createSourceRoutes(deps.sourceController));
  }

  if (deps.destinationController) {
    app.use("/api/v1/environments/:envId/destinations", createDestinationRoutes(deps.destinationController));
  }

  if (deps.ingestionController) {
    app.use("/ingest", createIngestionRoutes(deps.ingestionController));
  }

  if (deps.analyticsController) {
    app.use("/api/v1/environments/:envId/analytics", createAnalyticsRoutes(deps.analyticsController));
  }

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

  // readyz is intentionally distinct from healthz: healthz answers "is the
  // process alive", readyz answers "are dependencies reachable". As of
  // Phase 2 that means Postgres; Redis joins this check in Phase 7 once the
  // worker/queue layer exists — added incrementally, not stubbed in advance.
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
