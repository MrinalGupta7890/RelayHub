import { ApiKeyRepository, AuditLogRepository, ApiKeyId, OrganizationId, UserId } from "@relayhub/domain";

export class RevokeApiKeyUseCase {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(id: ApiKeyId, organizationId: OrganizationId, userId: UserId): Promise<void> {
    await this.apiKeyRepo.revoke(id);

    await this.auditRepo.create({
      organizationId,
      userId,
      action: "apikey.revoked",
      metadata: { apiKeyId: id },
    });
  }
}
