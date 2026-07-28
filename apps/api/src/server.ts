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

const env = loadApiEnv();
const logger = createLogger(env);
const prisma = getPrismaClient({ logQueries: env.NODE_ENV === "development" });

import { PrismaOrganizationRepository, PrismaProjectRepository, PrismaMembershipRepository, PrismaAuditLogRepository } from "@relayhub/database";

const userRepository = new PrismaUserRepository(prisma);
const sessionRepository = new PrismaSessionRepository(prisma);
const passwordHasher = new Argon2PasswordHasher();
const tokenService = new JwtTokenService(env.JWT_SECRET);

const organizationRepository = new PrismaOrganizationRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);
const membershipRepository = new PrismaMembershipRepository(prisma);
const auditLogRepository = new PrismaAuditLogRepository(prisma);

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

const app = createApp(logger, {
  checkDatabase: () => checkDatabaseConnection(prisma),
  authController,
  organizationController,
  projectController,
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
