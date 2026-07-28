import { Router } from "express";
import { OrganizationController } from "../controllers/OrganizationController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

export function createOrganizationRoutes(orgController: OrganizationController): Router {
  const router = Router();

  // Need auth for all org routes
  router.use(requireAuth);

  // List all orgs for the current user
  router.get("/", orgController.list);

  // Create a new org
  router.post("/", orgController.create);

  return router;
}
