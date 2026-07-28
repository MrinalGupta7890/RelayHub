import { EventRepository, QueueService, DeliveryAttemptRepository } from "@relayhub/domain";

export class RetryEventUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly queueService: QueueService,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository
  ) {}

  async execute(eventId: string, _environmentId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const attempts = await this.deliveryAttemptRepository.listByEvent(eventId);
    
    const destStates = new Map<string, boolean>();
    const sortedAttempts = [...attempts].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    
    for (const attempt of sortedAttempts) {
      if (attempt.responseStatus && attempt.responseStatus >= 200 && attempt.responseStatus < 300) {
        destStates.set(attempt.destinationId, true);
      } else {
        if (!destStates.get(attempt.destinationId)) {
          destStates.set(attempt.destinationId, false);
        }
      }
    }

    let retriedCount = 0;
    for (const [destinationId, succeeded] of destStates.entries()) {
      if (!succeeded) {
        // Enqueue replay for this specific destination
        await this.queueService.enqueueReplay(eventId, destinationId);
        retriedCount++;
      }
    }

    if (retriedCount === 0) {
      throw new Error("No failed destinations found to retry.");
    }
  }
}

