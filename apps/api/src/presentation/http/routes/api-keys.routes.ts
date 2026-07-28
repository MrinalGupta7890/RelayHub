import { Router } from "express";
import { ApiKeyController } from "../controllers/ApiKeyController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { tenancyGuard } from "../middlewares/tenancyGuard";

export function createApiKeyRoutes(apiKeyController: ApiKeyController): Router {
  const router = Router({ mergeParams: true });
  
  // Mounted at /api/v1/environments/:envId/api-keys
  // TenancyGuard will resolve envId -> projectId -> orgId
  router.use(requireAuth, tenancyGuard);

  router.get("/", requireRole(["OWNER", "ADMIN", "MEMBER"]), apiKeyController.list);
  router.post("/", requireRole(["OWNER", "ADMIN"]), apiKeyController.create);
  router.delete("/:keyId", requireRole(["OWNER", "ADMIN"]), apiKeyController.revoke);

  return router;
}
