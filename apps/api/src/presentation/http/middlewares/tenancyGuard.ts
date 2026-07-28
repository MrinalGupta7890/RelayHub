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
  
  if (projectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Attach orgId so requireRole can use it
      req.params.orgId = project.organizationId;
    } catch (e) {
      console.error("TenancyGuard error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  next();
}
