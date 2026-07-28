import type { AuditLogEntry } from "../entities";
import type { OrganizationId } from "../entities";
import type { UserId } from "../entities";
import type { CursorPage, CursorPageParams } from "./pagination";

export interface AuditLogRepository {
  create(input: { organizationId: OrganizationId; userId: UserId | null; action: string; metadata: Record<string, unknown> | null }): Promise<AuditLogEntry>;
  listByOrganization(organizationId: OrganizationId, params: CursorPageParams): Promise<CursorPage<AuditLogEntry>>;
}
