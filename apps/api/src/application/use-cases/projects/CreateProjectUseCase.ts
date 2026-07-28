import { ProjectRepository, AuditLogRepository, Project, OrganizationId, UserId } from "@relayhub/domain";

export type CreateProjectInput = {
  organizationId: OrganizationId;
  name: string;
  userId: UserId;
};

export class CreateProjectUseCase {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateProjectInput): Promise<Project> {
    const project = await this.projectRepo.create({
      organizationId: input.organizationId,
      name: input.name,
    });

    await this.auditRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "project.created",
      metadata: { projectId: project.id, projectName: input.name },
    });

    return project;
  }
}
