import { SourceRepository, Source, VerificationType, EnvironmentId, AuditLogRepository, OrganizationId, UserId } from "@relayhub/domain";
import { EncryptionService } from "../../ports/EncryptionService";
import crypto from "crypto";

export type CreateSourceInput = {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  userId: UserId;
  name: string;
  verificationType: VerificationType;
};

export type CreateSourceResult = {
  source: Source;
  secret: string | null;
};

export class CreateSourceUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly encryptionService: EncryptionService,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateSourceInput): Promise<CreateSourceResult> {
    const ingestionSlug = crypto.randomBytes(16).toString("hex");

    let secretPlaintext: string | null = null;
    let secretEncrypted = "";

    if (input.verificationType !== VerificationType.NONE) {
      secretPlaintext = crypto.randomBytes(32).toString("hex");
      secretEncrypted = this.encryptionService.encrypt(secretPlaintext);
    } else {
      secretEncrypted = this.encryptionService.encrypt("NONE"); // Just store an encrypted placeholder
    }

    const source = await this.sourceRepository.create({
      environmentId: input.environmentId,
      name: input.name,
      verificationType: input.verificationType,
      secretEncrypted,
      ingestionSlug,
    });

    await this.auditRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "source.created",
      metadata: { sourceId: source.id, environmentId: input.environmentId },
    });

    return {
      source,
      secret: secretPlaintext,
    };
  }
}
