import { PrismaClient } from "@prisma/client";
import { PrismaOrganizationRepository, PrismaProjectRepository, PrismaEnvironmentRepository, PrismaMembershipRepository } from "../src/repositories/prisma-tenancy.repository";
import { Role } from "@relayhub/domain";

/**
 * Integration tests against a REAL Postgres instance (via DATABASE_URL).
 * Requires `docker compose up -d` and `pnpm db:migrate:deploy` to have run
 * first — these deliberately do not mock Prisma, since the whole point of
 * this suite is proving the schema + repository mapping layer actually
 * round-trips correctly against real Postgres constraints (unique keys,
 * foreign keys, enum columns).
 */
describe("Tenancy repositories (integration)", () => {
  const prisma = new PrismaClient();
  const organizations = new PrismaOrganizationRepository(prisma);
  const projects = new PrismaProjectRepository(prisma);
  const environments = new PrismaEnvironmentRepository(prisma);
  const memberships = new PrismaMembershipRepository(prisma);

  const testSlug = `test-org-${Date.now()}`;

  afterAll(async () => {
    await prisma.membership.deleteMany({ where: { organization: { slug: testSlug } } });
    await prisma.environment.deleteMany({ where: { project: { organization: { slug: testSlug } } } });
    await prisma.project.deleteMany({ where: { organization: { slug: testSlug } } });
    await prisma.organization.deleteMany({ where: { slug: testSlug } });
    await prisma.$disconnect();
  });

  it("creates an organization and finds it by slug", async () => {
    const org = await organizations.create({ name: "Test Org", slug: testSlug });
    expect(org.id).toBeDefined();

    const found = await organizations.findBySlug(testSlug);
    expect(found?.id).toBe(org.id);
  });

  it("creates a project under the organization", async () => {
    const org = await organizations.findBySlug(testSlug);
    const project = await projects.create({ organizationId: org!.id, name: "Test Project" });

    const listed = await projects.listByOrganization(org!.id);
    expect(listed.map((p) => p.id)).toContain(project.id);
  });

  it("enforces unique (projectId, name) on environments", async () => {
    const org = await organizations.findBySlug(testSlug);
    const [project] = await projects.listByOrganization(org!.id);
    await environments.create({ projectId: project!.id, name: "live" });

    await expect(environments.create({ projectId: project!.id, name: "live" })).rejects.toThrow();
  });

  it("soft-deletes an organization instead of removing the row", async () => {
    const org = await organizations.create({ name: "Soft Delete Org", slug: `${testSlug}-soft` });
    await organizations.softDelete(org.id);

    const found = await organizations.findById(org.id);
    expect(found).toBeNull(); // repository filters deletedAt: null

    const raw = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(raw?.deletedAt).not.toBeNull(); // row still physically exists

    await prisma.organization.delete({ where: { id: org.id } }); // cleanup
  });

  it("creates a membership with a role and enforces one membership per (user, org)", async () => {
    const org = await organizations.findBySlug(testSlug);
    const user = await prisma.user.create({
      data: { email: `${testSlug}@example.com`, passwordHash: "unused-in-this-phase", name: "Test User" },
    });

    const membership = await memberships.create({ userId: user.id, organizationId: org!.id, role: Role.OWNER });
    expect(membership.role).toBe(Role.OWNER);

    await expect(
      memberships.create({ userId: user.id, organizationId: org!.id, role: Role.MEMBER }),
    ).rejects.toThrow();

    await prisma.membership.delete({ where: { id: membership.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
