import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/requireAuth";
import { ListAuditLogsUseCase } from "../../../application/use-cases/audit-logs/ListAuditLogsUseCase";

export class AuditLogController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  list = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.orgId;
      if (!organizationId) {
        return res.status(400).json({ error: "orgId parameter is required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const cursor = req.query.cursor ? (req.query.cursor as string) : null;
      const page = await this.listAuditLogsUseCase.execute({
        organizationId,
        params: { limit, cursor },
      });

      res.status(200).json(page);
    } catch (e: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
