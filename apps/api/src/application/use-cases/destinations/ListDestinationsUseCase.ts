import { DestinationRepository, Destination, EnvironmentId } from "@relayhub/domain";

export type ListDestinationsInput = {
  environmentId: EnvironmentId;
};

export class ListDestinationsUseCase {
  constructor(private readonly destinationRepository: DestinationRepository) {}

  async execute(input: ListDestinationsInput): Promise<Destination[]> {
    return this.destinationRepository.listByEnvironment(input.environmentId);
  }
}
