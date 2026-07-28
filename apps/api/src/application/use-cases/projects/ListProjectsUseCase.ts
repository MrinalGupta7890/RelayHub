import { ProjectRepository, Project, OrganizationId } from "@relayhub/domain";

export class ListProjectsUseCase {
  constructor(private readonly projectRepo: ProjectRepository) {}

  async execute(organizationId: OrganizationId): Promise<Project[]> {
    return this.projectRepo.listByOrganization(organizationId);
  }
}
