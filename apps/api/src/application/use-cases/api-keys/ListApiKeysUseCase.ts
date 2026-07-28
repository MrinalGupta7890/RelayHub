import { ApiKeyRepository, ApiKey, EnvironmentId } from "@relayhub/domain";

export class ListApiKeysUseCase {
  constructor(private readonly apiKeyRepo: ApiKeyRepository) {}

  async execute(environmentId: EnvironmentId): Promise<Omit<ApiKey, "secretHash">[]> {
    const keys = await this.apiKeyRepo.listByEnvironment(environmentId);
    // Never leak the hash back to the client
    return keys.map(({ secretHash, ...rest }) => rest);
  }
}
