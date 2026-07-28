import { Router } from "express";
import { AuditLogController } from "../controllers/AuditLogController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { Role } from "@relayhub/domain";
import { tenancyGuard } from "../middlewares/tenancyGuard";

export function createAuditLogRoutes(auditLogController: AuditLogController): Router {
  const router = Router();

  router.use(requireAuth);

  // Must be at least a VIEWER in the organization to see audit logs
  router.get(
    "/:orgId/audit-logs",
    tenancyGuard,
    requireRole([Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER]),
    auditLogController.list
  );

  return router;
}
