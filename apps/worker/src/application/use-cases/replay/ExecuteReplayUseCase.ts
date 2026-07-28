import { EventRepository, DeliveryAttemptRepository, QueueService, DeliveryStatus } from "@relayhub/domain";
import { Logger } from "pino";

export class ExecuteReplayUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository,
    private readonly queueService: QueueService,
    private readonly logger: Logger
  ) {}

  async execute(eventId: string, destinationId?: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      this.logger.error({ eventId }, "Replay failed: Event not found");
      return;
    }

    let targetDestinationIds: string[] = [];

    if (destinationId) {
      targetDestinationIds = [destinationId];
    } else {
      // Find all destinations that previously had an attempt for this event
      const attempts = await this.deliveryAttemptRepository.listByEvent(eventId);
      const uniqueDestinations = new Set(attempts.map(a => a.destinationId));
      targetDestinationIds = Array.from(uniqueDestinations);
    }

    if (targetDestinationIds.length === 0) {
      this.logger.info({ eventId }, "Replay skipped: No previous attempts found for event");
      return;
    }

    for (const targetId of targetDestinationIds) {
      // Create a fresh attempt (attemptNumber = 1)
      const newAttempt = await this.deliveryAttemptRepository.create({
        eventId: event.id,
        destinationId: targetId,
        attemptNumber: 1,
        status: DeliveryStatus.QUEUED,
        scheduledAt: new Date(),
      });

      await this.queueService.enqueueDelivery(newAttempt.id);

      this.logger.info(
        { eventId: event.id, destinationId: targetId, newAttemptId: newAttempt.id },
        "Replay enqueued a new delivery attempt"
      );
    }
  }
}
