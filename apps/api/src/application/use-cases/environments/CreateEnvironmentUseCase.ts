import { EnvironmentRepository, AuditLogRepository, Environment, ProjectId, OrganizationId, UserId } from "@relayhub/domain";

export type CreateEnvironmentInput = {
  projectId: ProjectId;
  organizationId: OrganizationId;
  name: string;
  userId: UserId;
};

export class CreateEnvironmentUseCase {
  constructor(
    private readonly environmentRepo: EnvironmentRepository,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateEnvironmentInput): Promise<Environment> {
    const existing = await this.environmentRepo.findByProjectAndName(input.projectId, input.name);
    if (existing) {
      throw new Error(`Environment '${input.name}' already exists in this project`);
    }

    const environment = await this.environmentRepo.create({
      projectId: input.projectId,
      name: input.name,
    });

    await this.auditRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "environment.created",
      metadata: { environmentId: environment.id, environmentName: input.name, projectId: input.projectId },
    });

    return environment;
  }
}
