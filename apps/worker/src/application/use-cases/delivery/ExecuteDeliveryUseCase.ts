import {
  DeliveryAttemptRepository,
  EventRepository,
  DestinationRepository,
  HttpDeliveryService,
  SignatureGenerator,
  DeliveryStatus,
  QueueService,
  BackoffCalculator,
  WsEmitterService,
} from "@relayhub/domain";
import { AesEncryptionService } from "../../../infrastructure/crypto/AesEncryptionService";
import { Logger } from "pino";

export class ExecuteDeliveryUseCase {
  constructor(
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository,
    private readonly eventRepository: EventRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly httpDeliveryService: HttpDeliveryService,
    private readonly queueService: QueueService,
    private readonly encryptionService: AesEncryptionService,
    private readonly wsEmitterService: WsEmitterService,
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
    let finalStatus = result.success ? DeliveryStatus.SUCCEEDED : DeliveryStatus.FAILED;
    const retryPolicy = destination.retryPolicy;

    if (!result.success && attempt.attemptNumber >= retryPolicy.maxAttempts) {
      finalStatus = DeliveryStatus.DEAD_LETTERED;
    }

    await this.deliveryAttemptRepository.updateStatus(attempt.id, {
      status: finalStatus,
      requestSnapshot: result.requestSnapshot ?? null,
      responseStatus: result.status,
      responseBody: result.body,
      errorMessage: result.error || null,
      durationMs: result.durationMs,
      completedAt: new Date(),
    });

    // Emit real-time event for the delivery update
    await this.wsEmitterService.emitDeliveryUpdated(
      destination.environmentId,
      event.id,
      attempt.id,
      finalStatus
    ).catch(err => {
      this.logger.error({ err, attemptId: attempt.id }, "Failed to emit real-time delivery update");
    });

    if (!result.success) {
      this.logger.warn(
        { attemptId: attempt.id, status: result.status, attemptNumber: attempt.attemptNumber },
        "Delivery failed"
      );
      
      if (finalStatus === DeliveryStatus.FAILED) {
        const delayMs = BackoffCalculator.calculateDelay(attempt.attemptNumber, retryPolicy);
        
        const nextAttempt = await this.deliveryAttemptRepository.create({
          eventId: event.id,
          destinationId: destination.id,
          attemptNumber: attempt.attemptNumber + 1,
          status: DeliveryStatus.QUEUED,
          scheduledAt: new Date(Date.now() + delayMs),
        });

        await this.queueService.enqueueDelivery(nextAttempt.id, delayMs);
        
        this.logger.info(
          { attemptId: attempt.id, nextAttemptId: nextAttempt.id, delayMs },
          "Scheduled next delivery attempt"
        );
      } else {
        this.logger.error(
          { attemptId: attempt.id, eventId: event.id },
          "Max delivery attempts reached. Attempt dead-lettered."
        );
      }
    }
  }
}
