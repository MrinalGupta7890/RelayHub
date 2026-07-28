import { AuditLogRepository, AuditLogEntry, OrganizationId, CursorPage, CursorPageParams } from "@relayhub/domain";

export type ListAuditLogsInput = {
  organizationId: OrganizationId;
  params: CursorPageParams;
};

export class ListAuditLogsUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(input: ListAuditLogsInput): Promise<CursorPage<AuditLogEntry>> {
    return this.auditLogRepository.listByOrganization(input.organizationId, input.params);
  }
}
