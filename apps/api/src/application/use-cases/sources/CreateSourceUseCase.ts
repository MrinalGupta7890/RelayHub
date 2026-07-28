import { SourceRepository, Source, VerificationType, EnvironmentId } from "@relayhub/domain";
import { EncryptionService } from "../../ports/EncryptionService";
import crypto from "crypto";

export type CreateSourceInput = {
  environmentId: EnvironmentId;
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
    private readonly encryptionService: EncryptionService
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

    return {
      source,
      secret: secretPlaintext,
    };
  }
}
