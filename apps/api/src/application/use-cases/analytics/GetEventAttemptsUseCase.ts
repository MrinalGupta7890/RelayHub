import { EventRepository, DeliveryAttemptRepository, SourceRepository, DeliveryAttempt } from "@relayhub/domain";

export class GetEventAttemptsUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository
  ) {}

  async execute(
    environmentId: string,
    eventId: string
  ): Promise<DeliveryAttempt[]> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Verify tenancy
    const source = await this.sourceRepository.findById(event.sourceId);
    if (!source || source.environmentId !== environmentId) {
      throw new Error(`Event ${eventId} does not belong to this environment`);
    }

    return this.deliveryAttemptRepository.listByEvent(eventId);
  }
}
