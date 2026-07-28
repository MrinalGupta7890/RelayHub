import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./requireAuth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // In a real app, this would be injected via DI

/**
 * Ensures that if a route operates on a specific projectId (e.g. /projects/:projectId/*),
 * it looks up the associated organizationId and attaches it to req.params.orgId
 * so that the existing requireRole middleware can validate access properly.
 */
export async function tenancyGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const projectId = req.params.projectId;
  const envId = req.params.envId;
  
  try {
    if (envId) {
      const environment = await prisma.environment.findUnique({
        where: { id: envId },
        include: { project: { select: { organizationId: true } } },
      });

      if (!environment) {
        return res.status(404).json({ error: "Environment not found" });
      }

      req.params.projectId = environment.projectId;
      req.params.orgId = environment.project.organizationId;
    } else if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      req.params.orgId = project.organizationId;
    }
  } catch (e) {
    console.error("TenancyGuard error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }

  next();
}
