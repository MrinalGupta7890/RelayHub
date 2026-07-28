import { Router } from "express";
import { IngestionController } from "../controllers/IngestionController";

export function createIngestionRoutes(ingestionController: IngestionController): Router {
  const router = Router({ mergeParams: true });

  // Public endpoint, no auth required
  router.post("/:slug", ingestionController.ingest);

  return router;
}
