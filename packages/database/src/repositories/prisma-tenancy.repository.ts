import type { PrismaClient } from "@prisma/client";
import type {
  OrganizationRepository,
  ProjectRepository,
  EnvironmentRepository,
  MembershipRepository,
  Organization,
  Project,
  Environment,
  Membership,
  OrganizationId,
  ProjectId,
  EnvironmentId,
  MembershipId,
  Role,
} from "@relayhub/domain";
import { cast } from "../mappers";

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { name: string; slug: string }): Promise<Organization> {
    return this.prisma.organization.create({ data: input });
  }

  async findById(id: OrganizationId): Promise<Organization | null> {
    return this.prisma.organization.findFirst({ where: { id, deletedAt: null } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({ where: { slug, deletedAt: null } });
  }

  async softDelete(id: OrganizationId): Promise<void> {
    await this.prisma.organization.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { organizationId: OrganizationId; name: string }): Promise<Project> {
    return this.prisma.project.create({ data: input });
  }

  async findById(id: ProjectId): Promise<Project | null> {
    return this.prisma.project.findFirst({ where: { id, deletedAt: null } });
  }

  async listByOrganization(organizationId: OrganizationId): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async softDelete(id: ProjectId): Promise<void> {
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export class PrismaEnvironmentRepository implements EnvironmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { projectId: ProjectId; name: string }): Promise<Environment> {
    return this.prisma.environment.create({ data: input });
  }

  async findById(id: EnvironmentId): Promise<Environment | null> {
    return this.prisma.environment.findUnique({ where: { id } });
  }

  async findByProjectAndName(projectId: ProjectId, name: string): Promise<Environment | null> {
    return this.prisma.environment.findUnique({ where: { projectId_name: { projectId, name } } });
  }

  async listByProject(projectId: ProjectId): Promise<Environment[]> {
    return this.prisma.environment.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
  }
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { userId: string; organizationId: OrganizationId; role: Role }): Promise<Membership> {
    const record = await this.prisma.membership.create({
      data: { ...input, role: cast(input.role) },
    });
    return cast<Membership>(record);
  }

  async findByUserAndOrganization(userId: string, organizationId: OrganizationId): Promise<Membership | null> {
    const record = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    return record ? cast<Membership>(record) : null;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({ where: { organizationId } });
    return cast<Membership[]>(records);
  }

  async listByUser(userId: string): Promise<Membership[]> {
    const records = await this.prisma.membership.findMany({ where: { userId } });
    return cast<Membership[]>(records);
  }

  async updateRole(id: MembershipId, role: Role): Promise<Membership> {
    const record = await this.prisma.membership.update({ where: { id }, data: { role: cast(role) } });
    return cast<Membership>(record);
  }

  async remove(id: MembershipId): Promise<void> {
    await this.prisma.membership.delete({ where: { id } });
  }
}
