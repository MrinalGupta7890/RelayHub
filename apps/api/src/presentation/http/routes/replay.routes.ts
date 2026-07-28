import { Router } from "express";
import { ReplayController } from "../controllers/ReplayController";
import { requireAuth } from "../middlewares/requireAuth";
import { tenancyGuard } from "../middlewares/tenancyGuard";
import { requireRole } from "../middlewares/requireRole";

export function createReplayRoutes(replayController: ReplayController): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(tenancyGuard);
  
  // Replays can be triggered by OWNER, ADMIN, MEMBER
  router.post("/events/:eventId/replay", requireRole(["OWNER", "ADMIN", "MEMBER"]), replayController.replay);

  return router;
}
