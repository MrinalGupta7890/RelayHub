import { Response } from "express";
import { CreateProjectUseCase } from "../../../application/use-cases/projects/CreateProjectUseCase";
import { ListProjectsUseCase } from "../../../application/use-cases/projects/ListProjectsUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
});

export class ProjectController {
  constructor(
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly listProjectsUseCase: ListProjectsUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) throw new Error("Unauthorized");
      
      const organizationId = req.params.orgId;
      if (!organizationId) throw new Error("organizationId is required");

      const { name } = createSchema.parse(req.body);
      const project = await this.createProjectUseCase.execute({
        organizationId,
        name,
        userId: req.userId,
      });

      res.status(201).json(project);
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: e.errors });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  };

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.orgId;
      if (!organizationId) throw new Error("organizationId is required");

      const projects = await this.listProjectsUseCase.execute(organizationId);
      res.status(200).json(projects);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
