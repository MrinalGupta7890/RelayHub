import { OrganizationRepository, MembershipRepository, AuditLogRepository, Organization, UserId, Role } from "@relayhub/domain";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  userId: UserId;
};

export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly auditRepo: AuditLogRepository
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    // Check if slug exists
    const existing = await this.organizationRepo.findBySlug(input.slug);
    if (existing) {
      throw new Error("Organization with this slug already exists");
    }

    // 1. Create Organization
    const organization = await this.organizationRepo.create({
      name: input.name,
      slug: input.slug,
    });

    try {
      // 2. Create OWNER membership
      await this.membershipRepo.create({
        userId: input.userId,
        organizationId: organization.id,
        role: Role.OWNER, 
      });

      // 3. Log Audit event
      await this.auditRepo.create({
        organizationId: organization.id,
        userId: input.userId,
        action: "organization.created",
        metadata: { name: input.name, slug: input.slug },
      });
    } catch (e) {
      // Basic rollback attempt (no strict UoW)
      await this.organizationRepo.softDelete(organization.id).catch(() => {});
      throw e;
    }

    return organization;
  }
}
