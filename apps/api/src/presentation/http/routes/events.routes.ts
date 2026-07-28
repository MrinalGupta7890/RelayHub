import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { requireAuth } from "../middlewares/requireAuth";
import { tenancyGuard } from "../middlewares/tenancyGuard";
import { requireRole } from "../middlewares/requireRole";

export function createEventsRoutes(controller: EventController): Router {
  const router = Router({ mergeParams: true });

  // Protect all event routes
  router.use(requireAuth);
  router.use(tenancyGuard);
  router.use(requireRole(["OWNER", "ADMIN", "MEMBER"]));

  router.get("/", controller.listEvents);
  router.post("/:eventId/retry", controller.retryEvent);

  return router;
}
