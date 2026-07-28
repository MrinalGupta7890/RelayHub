import { getPrismaClient, disconnectPrisma, checkDatabaseConnection, PrismaUserRepository, PrismaSessionRepository } from "@relayhub/database";

import { loadApiEnv } from "./config/env";
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

import { AesEncryptionService } from "./infrastructure/crypto/AesEncryptionService";
import { PrismaSourceRepository, PrismaDestinationRepository } from "@relayhub/database";

const env = loadApiEnv();
const logger = createLogger(env);
const prisma = getPrismaClient({ logQueries: env.NODE_ENV === "development" });

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

const createSourceUseCase = new CreateSourceUseCase(sourceRepository, encryptionService);
const listSourcesUseCase = new ListSourcesUseCase(sourceRepository);
const sourceController = new SourceController(createSourceUseCase, listSourcesUseCase);

const createDestinationUseCase = new CreateDestinationUseCase(destinationRepository, encryptionService);
const listDestinationsUseCase = new ListDestinationsUseCase(destinationRepository);
const updateDestinationUseCase = new UpdateDestinationUseCase(destinationRepository);
const destinationController = new DestinationController(createDestinationUseCase, listDestinationsUseCase, updateDestinationUseCase);

const app = createApp(logger, {
  checkDatabase: () => checkDatabaseConnection(prisma),
  authController,
  organizationController,
  projectController,
  environmentController,
  apiKeyController,
  sourceController,
  destinationController,
});

const server = app.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT, env: env.NODE_ENV }, "RelayHub API listening");
});

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(async () => {
    await disconnectPrisma();
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
