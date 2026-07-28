import { EventRepository, SourceRepository, Event, CursorPage, CursorPageParams } from "@relayhub/domain";

export class GetSourceEventsUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly eventRepository: EventRepository
  ) {}

  async execute(
    environmentId: string,
    sourceId: string,
    params: CursorPageParams
  ): Promise<CursorPage<Event>> {
    const source = await this.sourceRepository.findById(sourceId);
    
    if (!source || source.environmentId !== environmentId) {
      throw new Error(`Source ${sourceId} not found or does not belong to this environment`);
    }

    return this.eventRepository.listBySource(sourceId, params);
  }
}
