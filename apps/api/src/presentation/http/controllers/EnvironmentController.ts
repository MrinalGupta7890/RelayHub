import { Response } from "express";
import { CreateEnvironmentUseCase } from "../../../application/use-cases/environments/CreateEnvironmentUseCase";
import { ListEnvironmentsUseCase } from "../../../application/use-cases/environments/ListEnvironmentsUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export class EnvironmentController {
  constructor(
    private readonly createEnvironmentUseCase: CreateEnvironmentUseCase,
    private readonly listEnvironmentsUseCase: ListEnvironmentsUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) throw new Error("Unauthorized");
      
      const projectId = req.params.projectId;
      const organizationId = req.params.orgId; // Injected by TenancyGuard
      if (!projectId || !organizationId) throw new Error("Missing projectId or organizationId");

      const { name } = createSchema.parse(req.body);
      
      const environment = await this.createEnvironmentUseCase.execute({
        projectId,
        organizationId,
        name,
        userId: req.userId,
      });

      res.status(201).json(environment);
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
      const projectId = req.params.projectId;
      if (!projectId) throw new Error("projectId is required");

      const environments = await this.listEnvironmentsUseCase.execute(projectId);
      res.status(200).json(environments);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
