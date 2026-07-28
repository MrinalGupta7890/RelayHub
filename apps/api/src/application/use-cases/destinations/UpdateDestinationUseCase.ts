import { DestinationRepository, Destination, DestinationId, RetryPolicy } from "@relayhub/domain";

export type UpdateDestinationInput = {
  id: DestinationId;
  name?: string | undefined;
  url?: string | undefined;
  eventTypeFilters?: string[] | undefined;
  customHeaders?: Record<string, string> | null | undefined;
  retryPolicy?: RetryPolicy | undefined;
  isActive?: boolean | undefined;
};

export class UpdateDestinationUseCase {
  constructor(private readonly destinationRepository: DestinationRepository) {}

  async execute(input: UpdateDestinationInput): Promise<Destination> {
    const existing = await this.destinationRepository.findById(input.id);
    if (!existing) {
      throw new Error("Destination not found");
    }

    const changes = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.eventTypeFilters !== undefined && { eventTypeFilters: input.eventTypeFilters }),
      ...(input.customHeaders !== undefined && { customHeaders: input.customHeaders }),
      ...(input.retryPolicy !== undefined && { retryPolicy: input.retryPolicy }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    return this.destinationRepository.update(input.id, changes);
  }
}
