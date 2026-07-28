import { ApiKeyRepository, AuditLogRepository, EnvironmentRepository, PasswordHasher, ApiKey, EnvironmentId, OrganizationId, UserId } from "@relayhub/domain";
import crypto from "crypto";

export type CreateApiKeyInput = {
  environmentId: EnvironmentId;
  organizationId: OrganizationId;
  name: string;
  userId: UserId;
};

export type CreateApiKeyResult = {
  apiKey: ApiKey;
  secret: string; // The raw secret, only returned once
};

export class CreateApiKeyUseCase {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly environmentRepo: EnvironmentRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    const env = await this.environmentRepo.findById(input.environmentId);
    if (!env) throw new Error("Environment not found");

    // Generate prefix: rlh_{envName}_{4_random_chars}
    const envPrefix = env.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const randomChars = crypto.randomBytes(2).toString("hex");
    const prefix = `rlh_${envPrefix}_${randomChars}`;

    // Generate secret: 32 bytes (64 hex characters)
    const rawSecret = crypto.randomBytes(32).toString("hex");
    const fullKey = `${prefix}_${rawSecret}`; // What the user copies

    // Hash the secret part (or the full key, but hashing just the secret is fine, actually let's hash the full key so the DB hash matches what the client provides later)
    // The architecture doc says "secretHash: bcrypt/argon2 hash of the full secret"
    const secretHash = await this.passwordHasher.hash(fullKey);

    const apiKey = await this.apiKeyRepo.create({
      environmentId: input.environmentId,
      name: input.name,
      prefix,
      secretHash,
    });

    await this.auditRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: "apikey.created",
      metadata: { apiKeyId: apiKey.id, environmentId: input.environmentId },
    });

    return {
      apiKey,
      secret: fullKey,
    };
  }
}
