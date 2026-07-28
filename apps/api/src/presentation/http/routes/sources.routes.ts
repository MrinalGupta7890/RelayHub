import { Router } from "express";
import { SourceController } from "../controllers/SourceController";
import { requireAuth } from "../middlewares/requireAuth";
import { tenancyGuard } from "../middlewares/tenancyGuard";
import { requireRole } from "../middlewares/requireRole";

export function createSourceRoutes(sourceController: SourceController): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(tenancyGuard);

  // Both ADMIN and OWNER can create sources
  router.post("/", requireRole(["OWNER", "ADMIN"]), sourceController.create);

  // Any member can list sources
  router.get("/", requireRole(["OWNER", "ADMIN", "MEMBER"]), sourceController.list);

  return router;
}
