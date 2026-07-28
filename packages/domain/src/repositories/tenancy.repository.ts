import type { Organization, OrganizationId, Project, ProjectId, Environment, EnvironmentId, Membership, MembershipId, Role } from "../entities";

export interface OrganizationRepository {
  create(input: { name: string; slug: string }): Promise<Organization>;
  findById(id: OrganizationId): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  softDelete(id: OrganizationId): Promise<void>;
}

export interface ProjectRepository {
  create(input: { organizationId: OrganizationId; name: string }): Promise<Project>;
  findById(id: ProjectId): Promise<Project | null>;
  listByOrganization(organizationId: OrganizationId): Promise<Project[]>;
  softDelete(id: ProjectId): Promise<void>;
}

export interface EnvironmentRepository {
  create(input: { projectId: ProjectId; name: string }): Promise<Environment>;
  findById(id: EnvironmentId): Promise<Environment | null>;
  findByProjectAndName(projectId: ProjectId, name: string): Promise<Environment | null>;
  listByProject(projectId: ProjectId): Promise<Environment[]>;
}

export interface MembershipRepository {
  create(input: { userId: string; organizationId: OrganizationId; role: Role }): Promise<Membership>;
  findByUserAndOrganization(userId: string, organizationId: OrganizationId): Promise<Membership | null>;
  listByOrganization(organizationId: OrganizationId): Promise<Membership[]>;
  listByUser(userId: string): Promise<Membership[]>;
  updateRole(id: MembershipId, role: Role): Promise<Membership>;
  remove(id: MembershipId): Promise<void>;
}
