import { EnvironmentRepository, Environment, ProjectId } from "@relayhub/domain";

export class ListEnvironmentsUseCase {
  constructor(private readonly environmentRepo: EnvironmentRepository) {}

  async execute(projectId: ProjectId): Promise<Environment[]> {
    return this.environmentRepo.listByProject(projectId);
  }
}
