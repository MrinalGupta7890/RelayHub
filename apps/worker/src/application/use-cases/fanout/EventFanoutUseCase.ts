import { EventRepository, DestinationRepository, SourceRepository, QueueService, EventTypeMatcher, DeliveryAttemptRepository, DeliveryStatus } from "@relayhub/domain";

export class EventFanoutUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository,
    private readonly queueService: QueueService
  ) {}

  async execute(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const source = await this.sourceRepository.findById(event.sourceId);
    if (!source) {
      throw new Error(`Source ${event.sourceId} not found`);
    }

    const destinations = await this.destinationRepository.listActiveByEnvironment(source.environmentId);
    
    for (const destination of destinations) {
      const isMatch = EventTypeMatcher.matchesAny(event.eventType, destination.eventTypeFilters);
      
      if (isMatch) {
        // Create a DeliveryAttempt for this destination
        const attempt = await this.deliveryAttemptRepository.create({
          eventId: event.id,
          destinationId: destination.id,
          attemptNumber: 1,
          status: DeliveryStatus.QUEUED,
          scheduledAt: new Date(), // Immediate delivery
        });

        // Enqueue the job for Phase 9 worker
        await this.queueService.enqueueDelivery(attempt.id);
      }
    }
  }
}
