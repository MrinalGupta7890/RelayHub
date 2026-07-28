import { EventRepository, SourceRepository, DestinationRepository, QueueService } from "@relayhub/domain";

export class ReplayEventUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly queueService: QueueService
  ) {}

  async execute(environmentId: string, eventId: string, destinationId?: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const source = await this.sourceRepository.findById(event.sourceId);
    if (!source || source.environmentId !== environmentId) {
      throw new Error(`Event ${eventId} not found in environment ${environmentId}`);
    }

    if (destinationId) {
      const destination = await this.destinationRepository.findById(destinationId);
      if (!destination || destination.environmentId !== environmentId) {
        throw new Error(`Destination ${destinationId} not found in environment ${environmentId}`);
      }
    }

    await this.queueService.enqueueReplay(eventId, destinationId);
  }
}
