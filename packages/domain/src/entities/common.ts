/**
 * Shared shape conventions applied consistently across every domain entity,
 * mirroring the audit columns mandated in the architecture doc (Section 11):
 * every persisted entity is timestamped, and soft-deletable entities carry
 * `deletedAt` rather than being physically removed.
 */
export interface Timestamped {
  createdAt: Date;
}

export interface Updatable extends Timestamped {
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}
