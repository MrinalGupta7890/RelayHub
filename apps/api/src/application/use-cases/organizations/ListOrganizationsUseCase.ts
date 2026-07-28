import { MembershipRepository, OrganizationRepository, UserId } from "@relayhub/domain";

export type ListOrganizationsResult = {
  id: string;
  name: string;
  slug: string;
  role: string;
}[];

export class ListOrganizationsUseCase {
  constructor(
    private readonly membershipRepo: MembershipRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(userId: UserId): Promise<ListOrganizationsResult> {
    const memberships = await this.membershipRepo.listByUser(userId);
    
    // N+1 query concern here if a user has 100+ orgs, but typically it's 1-5.
    // Clean architecture repository interfaces don't leak "include" semantics,
    // so we fetch manually or could extend repository.
    const results: ListOrganizationsResult = [];
    for (const membership of memberships) {
      const org = await this.organizationRepo.findById(membership.organizationId);
      if (org && !org.deletedAt) {
        results.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: membership.role,
        });
      }
    }

    return results;
  }
}
