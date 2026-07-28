import { Router } from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { requireAuth } from "../middlewares/requireAuth";
import { tenancyGuard } from "../middlewares/tenancyGuard";
import { requireRole } from "../middlewares/requireRole";

export function createAnalyticsRoutes(analyticsController: AnalyticsController): Router {
  const router = Router({ mergeParams: true });

  // Protect all analytics routes
  router.use(requireAuth);
  router.use(tenancyGuard);
  router.use(requireRole(["OWNER", "ADMIN", "MEMBER"]));

  router.get("/sources/:sourceId/events", analyticsController.getSourceEvents);
  router.get("/events/:eventId/attempts", analyticsController.getEventAttempts);
  router.get("/destinations/:destinationId/attempts", analyticsController.getDestinationAttempts);

  return router;
}
