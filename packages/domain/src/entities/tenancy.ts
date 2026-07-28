import type { Updatable, SoftDeletable, Timestamped } from "./common";

export type OrganizationId = string;
export type ProjectId = string;
export type EnvironmentId = string;
export type MembershipId = string;

/**
 * Roles are ordered by privilege for straightforward comparison in RBAC
 * checks (Phase 3): OWNER > ADMIN > MEMBER > VIEWER.
 */
export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export const ROLE_RANK: Record<Role, number> = {
  [Role.OWNER]: 3,
  [Role.ADMIN]: 2,
  [Role.MEMBER]: 1,
  [Role.VIEWER]: 0,
};

export interface Organization extends Updatable, SoftDeletable {
  id: OrganizationId;
  name: string;
  slug: string;
}

export interface Membership extends Timestamped {
  id: MembershipId;
  userId: string;
  organizationId: OrganizationId;
  role: Role;
}

export interface Project extends Updatable, SoftDeletable {
  id: ProjectId;
  organizationId: OrganizationId;
  name: string;
}

export interface Environment extends Timestamped {
  id: EnvironmentId;
  projectId: ProjectId;
  /** "live" | "test" | custom name — free text by design so users can add staging/etc. */
  name: string;
}
