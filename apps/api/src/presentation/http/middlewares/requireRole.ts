import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./requireAuth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // In a real app, this would be injected via DI container

export function requireRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const organizationId = req.params.orgId || req.body.organizationId || req.query.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required for role validation" });
    }

    try {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: req.userId,
            organizationId: String(organizationId),
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: "Forbidden: Not a member of this organization" });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient role" });
      }

      next();
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
