import { DestinationRepository, DeliveryAttemptRepository, DeliveryAttempt, CursorPage, CursorPageParams } from "@relayhub/domain";

export class GetDestinationAttemptsUseCase {
  constructor(
    private readonly destinationRepository: DestinationRepository,
    private readonly deliveryAttemptRepository: DeliveryAttemptRepository
  ) {}

  async execute(
    environmentId: string,
    destinationId: string,
    params: CursorPageParams
  ): Promise<CursorPage<DeliveryAttempt>> {
    const destination = await this.destinationRepository.findById(destinationId);
    
    if (!destination || destination.environmentId !== environmentId) {
      throw new Error(`Destination ${destinationId} not found or does not belong to this environment`);
    }

    return this.deliveryAttemptRepository.listByDestination(destinationId, params);
  }
}
