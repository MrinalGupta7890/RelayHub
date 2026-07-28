import { Router } from "express";
import { DestinationController } from "../controllers/DestinationController";
import { requireAuth } from "../middlewares/requireAuth";
import { tenancyGuard } from "../middlewares/tenancyGuard";
import { requireRole } from "../middlewares/requireRole";

export function createDestinationRoutes(destinationController: DestinationController): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(tenancyGuard);

  // ADMIN and OWNER can create and update destinations
  router.post("/", requireRole(["OWNER", "ADMIN"]), destinationController.create);
  router.patch("/:destinationId", requireRole(["OWNER", "ADMIN"]), destinationController.update);

  // Any member can list destinations
  router.get("/", requireRole(["OWNER", "ADMIN", "MEMBER"]), destinationController.list);

  return router;
}
