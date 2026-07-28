import { Router } from "express";
import { EnvironmentController } from "../controllers/EnvironmentController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { tenancyGuard } from "../middlewares/tenancyGuard";

export function createEnvironmentRoutes(environmentController: EnvironmentController): Router {
  const router = Router({ mergeParams: true }); 
  
  // Notice that we use tenancyGuard here because this router is mounted at /api/v1/projects/:projectId/environments
  // so tenancyGuard will look up the projectId and inject orgId.
  router.use(requireAuth, tenancyGuard);

  // Need at least MEMBER to view environments
  router.get("/", requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), environmentController.list);

  // Need at least ADMIN to create environments
  router.post("/", requireRole(["OWNER", "ADMIN"]), environmentController.create);

  return router;
}
