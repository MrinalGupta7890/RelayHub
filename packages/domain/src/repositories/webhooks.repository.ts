import type { Source, SourceId, Destination, DestinationId, VerificationType, RetryPolicy } from "../entities";
import type { EnvironmentId } from "../entities";

export interface SourceRepository {
  create(input: {
    environmentId: EnvironmentId;
    name: string;
    verificationType: VerificationType;
    secretEncrypted: string;
    ingestionSlug: string;
  }): Promise<Source>;
  findById(id: SourceId): Promise<Source | null>;
  findByIngestionSlug(slug: string): Promise<Source | null>;
  listByEnvironment(environmentId: EnvironmentId): Promise<Source[]>;
  softDelete(id: SourceId): Promise<void>;
}

export interface DestinationRepository {
  create(input: {
    environmentId: EnvironmentId;
    name: string;
    url: string;
    secretEncrypted: string;
    eventTypeFilters: string[];
    customHeaders: Record<string, string> | null;
    retryPolicy: RetryPolicy;
  }): Promise<Destination>;
  findById(id: DestinationId): Promise<Destination | null>;
  /** Active destinations whose eventTypeFilters match a given event type —
   *  backs the fan-out step (Section 14, step 6). Filter matching itself is
   *  a domain concern implemented as a pure function in Phase 8, not here;
   *  this method returns the candidate set from the DB. */
  listActiveByEnvironment(environmentId: EnvironmentId): Promise<Destination[]>;
  update(id: DestinationId, changes: Partial<Pick<Destination, "name" | "url" | "eventTypeFilters" | "customHeaders" | "retryPolicy" | "isActive">>): Promise<Destination>;
  softDelete(id: DestinationId): Promise<void>;
}
