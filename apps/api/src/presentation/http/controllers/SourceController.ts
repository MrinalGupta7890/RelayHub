import { Response } from "express";
import { z } from "zod";
import { CreateSourceUseCase } from "../../../application/use-cases/sources/CreateSourceUseCase";
import { ListSourcesUseCase } from "../../../application/use-cases/sources/ListSourcesUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { VerificationType } from "@relayhub/domain";

const createSourceSchema = z.object({
  name: z.string().min(1).max(255),
  verificationType: z.nativeEnum(VerificationType),
});

export class SourceController {
  constructor(
    private readonly createSourceUseCase: CreateSourceUseCase,
    private readonly listSourcesUseCase: ListSourcesUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const environmentId = req.params.envId;
      const organizationId = req.params.orgId;
      const userId = req.userId;

      if (!environmentId || !organizationId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const parsed = createSourceSchema.parse(req.body);

      const result = await this.createSourceUseCase.execute({
        environmentId,
        organizationId,
        userId,
        name: parsed.name,
        verificationType: parsed.verificationType,
      });

      res.status(201).json({
        id: result.source.id,
        name: result.source.name,
        verificationType: result.source.verificationType,
        ingestionSlug: result.source.ingestionSlug,
        createdAt: result.source.createdAt,
        secret: result.secret, // returned only once
      });
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
      const envId = req.params.envId;
      if (!envId) {
        return res.status(400).json({ error: "envId parameter is required" });
      }

      const sources = await this.listSourcesUseCase.execute({ environmentId: envId });
      
      const responsePayload = sources.map(s => ({
        id: s.id,
        name: s.name,
        verificationType: s.verificationType,
        ingestionSlug: s.ingestionSlug,
        createdAt: s.createdAt,
      }));

      res.status(200).json(responsePayload);
    } catch (e: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
