import { Router } from "express";
import { SimulationController } from "../controllers/SimulationController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { tenancyGuard } from "../middlewares/tenancyGuard";

export function createSimulationRoutes(controller: SimulationController): Router {
  const router = Router({ mergeParams: true });

  // Access check: User must be at least a MEMBER of the organization that owns the project/environment
  router.use(requireAuth, tenancyGuard, requireRole(["OWNER", "ADMIN", "MEMBER"]));

  router.post("/", controller.simulate);

  return router;
}
