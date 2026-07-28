import { EventRepository, SourceRepository, QueueService, WsEmitterService, MetricsService } from "@relayhub/domain";
import crypto from "crypto";

export type SimulateEventInput = {
  environmentId: string;
  eventType: string;
  payload: any;
};

export type SimulateEventResult = {
  status: "accepted";
  eventId: string;
  sourceId: string;
};

export class SimulateEventUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly eventRepository: EventRepository,
    private readonly queueService: QueueService,
    private readonly wsEmitterService: WsEmitterService,
    private readonly metricsService: MetricsService
  ) {}

  async execute(input: SimulateEventInput): Promise<SimulateEventResult> {
    // A simulated event still needs a source to exist in the database because 
    // the Event model requires a sourceId.
    // We can pick the first source in the environment, or create a dummy one if none exists.
    let sources = await this.sourceRepository.listByEnvironment(input.environmentId);
    let source = sources.find((s: any) => s.name === "Simulator");

    if (!source) {
      if (sources.length > 0) {
        source = sources[0];
      } else {
        throw new Error("No sources found in environment to associate with simulated event.");
      }
    }

    const idempotencyKey = crypto.randomUUID();
    const correlationId = crypto.randomUUID();

    const headers = {
      "x-relayhub-simulated": "true",
      "content-type": "application/json"
    };

    const event = await this.eventRepository.create({
      sourceId: source!.id,
      eventType: input.eventType,
      idempotencyKey,
      payload: input.payload,
      headers,
      correlationId,
    });

    await this.queueService.enqueueFanout(event.id);

    // Emit real-time event
    await this.wsEmitterService.emitEventIngested(input.environmentId, event.id).catch(err => {
      console.error("Failed to emit real-time event for simulation:", err);
    });

    this.metricsService.incrementEventsIngested(input.environmentId);

    return {
      status: "accepted",
      eventId: event.id,
      sourceId: source!.id,
    };
  }
}
