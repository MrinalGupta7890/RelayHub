import { PrismaClient } from "@prisma/client";

/**
 * Phase 2 seed scope is deliberately limited to the pure tenancy structure
 * (Organization -> Project -> Environment). Seeding Users, ApiKeys, Sources,
 * or Destinations here would mean inventing credential/secret-handling logic
 * ahead of the phases that actually own it (Phase 3: Auth, Phase 5: API
 * Keys, Phase 6: Sources, Phase 8: Destinations) — this file gets extended
 * incrementally as each of those phases lands, not written speculatively now.
 */
const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: { name: "Acme Inc", slug: "acme" },
  });

  // Project has no natural unique key in the schema besides `id`, so
  // idempotency is handled with an explicit find-or-create rather than
  // `upsert` (which requires a unique `where`).
  let project = await prisma.project.findFirst({
    where: { organizationId: organization.id, name: "Default Project" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { organizationId: organization.id, name: "Default Project" },
    });
  }

  for (const envName of ["live", "test"]) {
    await prisma.environment.upsert({
      where: { projectId_name: { projectId: project.id, name: envName } },
      update: {},
      create: { projectId: project.id, name: envName },
    });
  }

  console.log(
    `Seeded organization "${organization.slug}" with project "${project.name}" (live + test environments).`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
