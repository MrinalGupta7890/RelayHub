import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

export function createProjectRoutes(projectController: ProjectController): Router {
  const router = Router({ mergeParams: true }); // mergeParams so we can get :orgId from parent router

  // Need auth and at least MEMBER role to view projects
  router.get("/", requireAuth, requireRole(["OWNER", "ADMIN", "MEMBER", "VIEWER"]), projectController.list);

  // Need auth and at least ADMIN role to create projects
  router.post("/", requireAuth, requireRole(["OWNER", "ADMIN"]), projectController.create);

  return router;
}
