import type { Timestamped, Updatable, SoftDeletable } from "./common";
import type { EnvironmentId } from "./tenancy";

export type SourceId = string;
export type DestinationId = string;

export enum VerificationType {
  HMAC_SHA256 = "HMAC_SHA256",
  HMAC_SHA1 = "HMAC_SHA1",
  NONE = "NONE",
}

export interface Source extends Timestamped, SoftDeletable {
  id: SourceId;
  environmentId: EnvironmentId;
  name: string;
  verificationType: VerificationType;
  /** AES-256-GCM ciphertext, never the plaintext secret (Section 26). */
  secretEncrypted: string;
  /** Forms the public ingestion URL: POST /ingest/:ingestionSlug */
  ingestionSlug: string;
}

/**
 * Per-destination retry policy override. Left as a plain interface (rather
 * than baked-in defaults) so the Retry Engine (Phase 10) can merge it with
 * a system-wide default without the domain layer knowing about queues.
 */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface Destination extends Updatable, SoftDeletable {
  id: DestinationId;
  environmentId: EnvironmentId;
  name: string;
  url: string;
  secretEncrypted: string;
  /** e.g. ["invoice.*", "user.created"] — glob-style event type filters. */
  eventTypeFilters: string[];
  customHeaders: Record<string, string> | null;
  retryPolicy: RetryPolicy;
  isActive: boolean;
}
