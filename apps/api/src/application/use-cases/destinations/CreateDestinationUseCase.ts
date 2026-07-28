import { DestinationRepository, Destination, EnvironmentId, RetryPolicy, AuditLogRepository, OrganizationId, UserId } from "@relayhub/domain";
import { EncryptionService } from "../../ports/EncryptionService";
import crypto from "crypto";

export type CreateDestinationInput = {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
  name: string;
  url: string;
  secret?: string | undefined;
  eventTypeFilters: string[];
  customHeaders?: Record<string, string> | null | undefined;
  retryPolicy?: RetryPolicy | undefined;
};

export type CreateDestinationResult = {
  destination: Destination;
  secret: string;
};

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 2000,
  maxDelayMs: 3600000, // 1 hour
};

export class CreateDestinationUseCase {
  constructor(
    private readonly destinationRepository: DestinationRepository,
    private readonly encryptionService: EncryptionService,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateDestinationInput): Promise<CreateDestinationResult> {
    // Generate a secure 32-byte hex secret if the user didn't provide one
    const secretPlaintext = input.secret || crypto.randomBytes(32).toString("hex");
    const secretEncrypted = this.encryptionService.encrypt(secretPlaintext);

    const destination = await this.destinationRepository.create({
      environmentId: input.environmentId,
      name: input.name,
      url: input.url,
      secretEncrypted,
      eventTypeFilters: input.eventTypeFilters,
      customHeaders: input.customHeaders || null,
      retryPolicy: input.retryPolicy || DEFAULT_RETRY_POLICY,
    });

    await this.auditRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "destination.created",
      metadata: { destinationId: destination.id, environmentId: input.environmentId, url: input.url },
    });

    return {
      destination,
      secret: secretPlaintext,
    };
  }
}
