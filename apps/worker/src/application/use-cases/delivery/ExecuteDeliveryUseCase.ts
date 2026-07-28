import {
  DeliveryAttemptRepository,
  EventRepository,
  DestinationRepository,
  HttpDeliveryService,
  SignatureGenerator,
  DeliveryStatus,
} from "@relayhub/domain";
import { AesEncryptionService } from "../../../infrastructure/crypto/AesEncryptionService";
import { Logger } from "pino";

export class ExecuteDeliveryUseCase {
  constructor(
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository,
    private readonly eventRepository: EventRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly httpDeliveryService: HttpDeliveryService,
    private readonly encryptionService: AesEncryptionService,
    private readonly logger: Logger
  ) {}

  async execute(deliveryAttemptId: string): Promise<void> {
    const attempt = await this.deliveryAttemptRepository.findById(deliveryAttemptId);
    if (!attempt) {
      throw new Error(`DeliveryAttempt ${deliveryAttemptId} not found`);
    }

    if (attempt.status !== DeliveryStatus.QUEUED) {
      this.logger.warn({ attemptId: attempt.id, status: attempt.status }, "Attempt is not in a deliverable state");
      return;
    }

    await this.deliveryAttemptRepository.updateStatus(attempt.id, {
      status: DeliveryStatus.IN_PROGRESS,
    });

    const event = await this.eventRepository.findById(attempt.eventId);
    if (!event) {
      throw new Error(`Event ${attempt.eventId} not found`);
    }

    const destination = await this.destinationRepository.findById(attempt.destinationId);
    if (!destination) {
      throw new Error(`Destination ${attempt.destinationId} not found`);
    }

    const payloadStr = typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload);
    
    // Decrypt destination secret
    const secret = this.encryptionService.decrypt(destination.secretEncrypted);
    
    // Generate Signature
    const signatureHeaderValue = SignatureGenerator.generate(payloadStr, secret, event.receivedAt.getTime());

    // Prepare headers
    const customHeaders = (destination.customHeaders as Record<string, string>) || {};
    const headers = {
      ...customHeaders,
      "Webhook-Id": event.id,
      "Webhook-Timestamp": Math.floor(event.receivedAt.getTime() / 1000).toString(),
      "Webhook-Signature": signatureHeaderValue,
      "x-relayhub-signature": signatureHeaderValue, // Alias
    };

    // Execute HTTP Request
    const result = await this.httpDeliveryService.deliver(
      destination.url,
      payloadStr,
      headers,
      10000 // 10s timeout
    );

    // Update Attempt Result
    const finalStatus = result.success ? DeliveryStatus.SUCCEEDED : DeliveryStatus.FAILED;

    await this.deliveryAttemptRepository.updateStatus(attempt.id, {
      status: finalStatus,
      requestSnapshot: result.requestSnapshot ?? null,
      responseStatus: result.status,
      responseBody: result.body,
      errorMessage: result.error || null,
      durationMs: result.durationMs,
      completedAt: new Date(),
    });

    if (!result.success) {
      // In Phase 9, we throw an error if it failed, so BullMQ knows the job failed.
      // In Phase 10, the RetryEngine might handle this without throwing, or the failure will trigger the backoff.
      throw new Error(`Delivery failed with status ${result.status}: ${result.error || result.body}`);
    }
  }
}
