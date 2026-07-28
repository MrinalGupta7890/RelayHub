import { getPrismaClient, disconnectPrisma, checkDatabaseConnection, PrismaUserRepository, PrismaSessionRepository } from "@relayhub/database";

import { loadApiEnv } from "./config/env";
import "./instrumentation";
import { createLogger } from "./logger";
import { createApp } from "./app";
import { Argon2PasswordHasher } from "./infrastructure/auth/Argon2PasswordHasher";
import { JwtTokenService } from "./infrastructure/auth/JwtTokenService";
import { RegisterUserUseCase } from "./application/use-cases/auth/RegisterUserUseCase";
import { LoginUserUseCase } from "./application/use-cases/auth/LoginUserUseCase";
import { RefreshSessionUseCase } from "./application/use-cases/auth/RefreshSessionUseCase";
import { AuthController } from "./presentation/http/controllers/AuthController";

import { CreateOrganizationUseCase } from "./application/use-cases/organizations/CreateOrganizationUseCase";
import { ListOrganizationsUseCase } from "./application/use-cases/organizations/ListOrganizationsUseCase";
import { OrganizationController } from "./presentation/http/controllers/OrganizationController";

import { CreateProjectUseCase } from "./application/use-cases/projects/CreateProjectUseCase";
import { ListProjectsUseCase } from "./application/use-cases/projects/ListProjectsUseCase";
import { ProjectController } from "./presentation/http/controllers/ProjectController";

import { CreateEnvironmentUseCase } from "./application/use-cases/environments/CreateEnvironmentUseCase";
import { ListEnvironmentsUseCase } from "./application/use-cases/environments/ListEnvironmentsUseCase";
import { EnvironmentController } from "./presentation/http/controllers/EnvironmentController";

import { CreateApiKeyUseCase } from "./application/use-cases/api-keys/CreateApiKeyUseCase";
import { ListApiKeysUseCase } from "./application/use-cases/api-keys/ListApiKeysUseCase";
import { RevokeApiKeyUseCase } from "./application/use-cases/api-keys/RevokeApiKeyUseCase";
import { ApiKeyController } from "./presentation/http/controllers/ApiKeyController";

import { CreateSourceUseCase } from "./application/use-cases/sources/CreateSourceUseCase";
import { ListSourcesUseCase } from "./application/use-cases/sources/ListSourcesUseCase";
import { SourceController } from "./presentation/http/controllers/SourceController";

import { CreateDestinationUseCase } from "./application/use-cases/destinations/CreateDestinationUseCase";
import { ListDestinationsUseCase } from "./application/use-cases/destinations/ListDestinationsUseCase";
import { UpdateDestinationUseCase } from "./application/use-cases/destinations/UpdateDestinationUseCase";
import { DestinationController } from "./presentation/http/controllers/DestinationController";

import { IngestEventUseCase } from "./application/use-cases/ingestion/IngestEventUseCase";
import { IngestionController } from "./presentation/http/controllers/IngestionController";
import { BullMqQueueService } from "./infrastructure/queue/bullmq/BullMqQueueService";
import Redis from "ioredis";

import { AesEncryptionService } from "./infrastructure/crypto/AesEncryptionService";
import { PrismaSourceRepository, PrismaDestinationRepository, PrismaEventRepository, PrismaDeliveryAttemptRepository } from "@relayhub/database";
import { GetSourceEventsUseCase } from "./application/use-cases/analytics/GetSourceEventsUseCase";
import { GetEventAttemptsUseCase } from "./application/use-cases/analytics/GetEventAttemptsUseCase";
import { GetDestinationAttemptsUseCase } from "./application/use-cases/analytics/GetDestinationAttemptsUseCase";
import { AnalyticsController } from "./presentation/http/controllers/AnalyticsController";
import { ReplayEventUseCase } from "./application/use-cases/replay/ReplayEventUseCase";
import { ReplayController } from "./presentation/http/controllers/ReplayController";
import { ListAuditLogsUseCase } from "./application/use-cases/audit-logs/ListAuditLogsUseCase";
import { AuditLogController } from "./presentation/http/controllers/AuditLogController";

import http from "http";
import { RedisWsEmitter } from "./infrastructure/websocket/RedisWsEmitter";
import { WebSocketGateway } from "./presentation/websocket/WebSocketGateway";

const env = loadApiEnv();
const logger = createLogger(env);
const prisma = getPrismaClient({ logQueries: env.NODE_ENV === "development" });
const redis = new Redis(env.REDIS_URL);
const redisSub = new Redis(env.REDIS_URL);
const queueService = new BullMqQueueService(redis);
const wsEmitterService = new RedisWsEmitter(redis);

import { PrismaOrganizationRepository, PrismaProjectRepository, PrismaMembershipRepository, PrismaAuditLogRepository, PrismaEnvironmentRepository, PrismaApiKeyRepository } from "@relayhub/database";

const userRepository = new PrismaUserRepository(prisma);
const sessionRepository = new PrismaSessionRepository(prisma);
const passwordHasher = new Argon2PasswordHasher();
const tokenService = new JwtTokenService(env.JWT_SECRET);
const encryptionService = new AesEncryptionService(env.ENCRYPTION_MASTER_KEY);

const organizationRepository = new PrismaOrganizationRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);
const membershipRepository = new PrismaMembershipRepository(prisma);
const auditLogRepository = new PrismaAuditLogRepository(prisma);
const environmentRepository = new PrismaEnvironmentRepository(prisma);
const apiKeyRepository = new PrismaApiKeyRepository(prisma);
const sourceRepository = new PrismaSourceRepository(prisma);
const destinationRepository = new PrismaDestinationRepository(prisma);
const eventRepository = new PrismaEventRepository(prisma);

const registerUseCase = new RegisterUserUseCase(userRepository, passwordHasher);
const loginUseCase = new LoginUserUseCase(userRepository, sessionRepository, passwordHasher, tokenService);
const refreshUseCase = new RefreshSessionUseCase(sessionRepository, tokenService);
const authController = new AuthController(registerUseCase, loginUseCase, refreshUseCase);

const createOrganizationUseCase = new CreateOrganizationUseCase(organizationRepository, membershipRepository, auditLogRepository);
const listOrganizationsUseCase = new ListOrganizationsUseCase(membershipRepository, organizationRepository);
const organizationController = new OrganizationController(createOrganizationUseCase, listOrganizationsUseCase);

const createProjectUseCase = new CreateProjectUseCase(projectRepository, auditLogRepository);
const listProjectsUseCase = new ListProjectsUseCase(projectRepository);
const projectController = new ProjectController(createProjectUseCase, listProjectsUseCase);

const createEnvironmentUseCase = new CreateEnvironmentUseCase(environmentRepository, auditLogRepository);
const listEnvironmentsUseCase = new ListEnvironmentsUseCase(environmentRepository);
const environmentController = new EnvironmentController(createEnvironmentUseCase, listEnvironmentsUseCase);

const createApiKeyUseCase = new CreateApiKeyUseCase(apiKeyRepository, environmentRepository, passwordHasher, auditLogRepository);
const listApiKeysUseCase = new ListApiKeysUseCase(apiKeyRepository);
const revokeApiKeyUseCase = new RevokeApiKeyUseCase(apiKeyRepository, auditLogRepository);
const apiKeyController = new ApiKeyController(createApiKeyUseCase, listApiKeysUseCase, revokeApiKeyUseCase);

const createSourceUseCase = new CreateSourceUseCase(sourceRepository, encryptionService, auditLogRepository);
const listSourcesUseCase = new ListSourcesUseCase(sourceRepository);
const sourceController = new SourceController(createSourceUseCase, listSourcesUseCase);

const createDestinationUseCase = new CreateDestinationUseCase(destinationRepository, encryptionService, auditLogRepository);
const listDestinationsUseCase = new ListDestinationsUseCase(destinationRepository);
const updateDestinationUseCase = new UpdateDestinationUseCase(destinationRepository, auditLogRepository);
const destinationController = new DestinationController(createDestinationUseCase, listDestinationsUseCase, updateDestinationUseCase);

import { PrometheusMetricsService } from "./infrastructure/observability/PrometheusMetricsService";
const metricsService = new PrometheusMetricsService();

const ingestEventUseCase = new IngestEventUseCase(sourceRepository, eventRepository, queueService, encryptionService, wsEmitterService, metricsService);
const ingestionController = new IngestionController(ingestEventUseCase);

const deliveryAttemptRepository = new PrismaDeliveryAttemptRepository(prisma);
const getSourceEventsUseCase = new GetSourceEventsUseCase(sourceRepository, eventRepository);
const getEventAttemptsUseCase = new GetEventAttemptsUseCase(eventRepository, sourceRepository, deliveryAttemptRepository);
const getDestinationAttemptsUseCase = new GetDestinationAttemptsUseCase(destinationRepository, deliveryAttemptRepository);
const analyticsController = new AnalyticsController(getSourceEventsUseCase, getEventAttemptsUseCase, getDestinationAttemptsUseCase);

const replayEventUseCase = new ReplayEventUseCase(eventRepository, sourceRepository, destinationRepository, queueService);
const replayController = new ReplayController(replayEventUseCase);

const listAuditLogsUseCase = new ListAuditLogsUseCase(auditLogRepository);
const auditLogController = new AuditLogController(listAuditLogsUseCase);

const app = createApp(logger, {
  checkDatabase: () => checkDatabaseConnection(prisma),
  authController,
  organizationController,
  projectController,
  environmentController,
  apiKeyController,
  sourceController,
  destinationController,
  ingestionController,
  analyticsController,
  replayController,
  auditLogController,
});

const httpServer = http.createServer(app);

const wsGateway = new WebSocketGateway(
  httpServer,
  redis,
  redisSub,
  env.JWT_SECRET,
  environmentRepository,
  logger
);

const server = httpServer.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT, env: env.NODE_ENV }, "RelayHub API listening");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  wsGateway.close();
  server.close(async () => {
    await disconnectPrisma();
    await redis.disconnect();
    await redisSub.disconnect();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
