import { Response } from "express";
import { CreateApiKeyUseCase } from "../../../application/use-cases/api-keys/CreateApiKeyUseCase";
import { ListApiKeysUseCase } from "../../../application/use-cases/api-keys/ListApiKeysUseCase";
import { RevokeApiKeyUseCase } from "../../../application/use-cases/api-keys/RevokeApiKeyUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
});

export class ApiKeyController {
  constructor(
    private readonly createApiKeyUseCase: CreateApiKeyUseCase,
    private readonly listApiKeysUseCase: ListApiKeysUseCase,
    private readonly revokeApiKeyUseCase: RevokeApiKeyUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) throw new Error("Unauthorized");
      
      const environmentId = req.params.envId;
      const organizationId = req.params.orgId; // Injected by TenancyGuard
      if (!environmentId || !organizationId) throw new Error("Missing environmentId or organizationId");

      const { name } = createSchema.parse(req.body);
      
      const result = await this.createApiKeyUseCase.execute({
        environmentId,
        organizationId,
        name,
        userId: req.userId,
      });

      res.status(201).json(result);
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
      const environmentId = req.params.envId;
      if (!environmentId) throw new Error("environmentId is required");

      const keys = await this.listApiKeysUseCase.execute(environmentId);
      res.status(200).json(keys);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  revoke = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) throw new Error("Unauthorized");
      const keyId = req.params.keyId;
      const organizationId = req.params.orgId; // Injected by TenancyGuard

      if (!keyId || !organizationId) throw new Error("Missing keyId or organizationId");

      await this.revokeApiKeyUseCase.execute(keyId, organizationId, req.userId);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
