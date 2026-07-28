import { SourceRepository, Source, EnvironmentId } from "@relayhub/domain";

export type ListSourcesInput = {
  environmentId: EnvironmentId;
};

export class ListSourcesUseCase {
  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(input: ListSourcesInput): Promise<Source[]> {
    return this.sourceRepository.listByEnvironment(input.environmentId);
  }
}
