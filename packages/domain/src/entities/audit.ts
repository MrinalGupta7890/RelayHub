import type { OrganizationId } from "./tenancy";
import type { UserId } from "./auth";

export type AuditLogEntryId = string;

export interface AuditLogEntry {
  id: AuditLogEntryId;
  organizationId: OrganizationId;
  userId: UserId | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
