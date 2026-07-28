import { EventRepository, SourceRepository, QueueService, SignatureVerifier, WsEmitterService, MetricsService } from "@relayhub/domain";
import { EncryptionService } from "../../ports/EncryptionService";
import crypto from "crypto";

export type IngestEventInput = {
  ingestionSlug: string;
  rawPayload: Buffer;
  headers: Record<string, string>;
  signatureHeader: string | null;
  correlationId: string;
  eventType: string; // usually extracted from payload or headers
};

export type IngestEventResult = {
  status: "accepted" | "deduplicated";
  eventId: string;
};

export class IngestEventUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly eventRepository: EventRepository,
    private readonly queueService: QueueService,
    private readonly encryptionService: EncryptionService,
    private readonly wsEmitterService: WsEmitterService,
    private readonly metricsService: MetricsService
  ) {}

  async execute(input: IngestEventInput): Promise<IngestEventResult> {
    const source = await this.sourceRepository.findByIngestionSlug(input.ingestionSlug);
    if (!source) {
      throw new Error("Source not found");
    }

    const secret = this.encryptionService.decrypt(source.secretEncrypted);
    const isValid = SignatureVerifier.verify(
      input.rawPayload,
      input.signatureHeader || "",
      secret,
      source.verificationType
    );

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    // Default idempotency key to payload hash if none provided in headers
    const idempotencyKey = input.headers["idempotency-key"] 
      || input.headers["x-idempotency-key"] 
      || crypto.createHash("sha256").update(input.rawPayload).digest("hex");

    let eventPayload: any;
    try {
      eventPayload = JSON.parse(input.rawPayload.toString("utf8"));
    } catch (e) {
      throw new Error("Invalid JSON payload");
    }

    try {
      const event = await this.eventRepository.create({
        sourceId: source.id,
        eventType: input.eventType,
        idempotencyKey,
        payload: eventPayload,
        headers: input.headers,
        correlationId: input.correlationId,
      });

      await this.queueService.enqueueFanout(event.id);

      // Emit real-time event
      await this.wsEmitterService.emitEventIngested(source.environmentId, event.id).catch(err => {
        // Log but do not fail ingestion
        console.error("Failed to emit real-time event:", err);
      });

      this.metricsService.incrementEventsIngested(source.environmentId);

      return {
        status: "accepted",
        eventId: event.id,
      };
    } catch (error: any) {
      if (error.message === "DuplicateEvent") {
        const existing = await this.eventRepository.findBySourceAndIdempotencyKey(source.id, idempotencyKey);
        if (!existing) {
          throw new Error("Idempotency conflict but event not found");
        }
        return {
          status: "deduplicated",
          eventId: existing.id,
        };
      }
      throw error;
    }
  }
}
