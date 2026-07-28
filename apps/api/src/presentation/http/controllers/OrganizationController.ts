import { Response } from "express";
import { CreateOrganizationUseCase } from "../../../application/use-cases/organizations/CreateOrganizationUseCase";
import { ListOrganizationsUseCase } from "../../../application/use-cases/organizations/ListOrganizationsUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) throw new Error("Unauthorized");
      
      const { name, slug } = createSchema.parse(req.body);
      const organization = await this.createOrganizationUseCase.execute({
        name,
        slug,
        userId: req.userId,
      });

      res.status(201).json(organization);
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
      if (!req.userId) throw new Error("Unauthorized");

      const organizations = await this.listOrganizationsUseCase.execute(req.userId);
      res.status(200).json(organizations);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
