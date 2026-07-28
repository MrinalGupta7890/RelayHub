import { Request, Response } from "express";
import { GetSourceEventsUseCase } from "../../../application/use-cases/analytics/GetSourceEventsUseCase";
import { GetEventAttemptsUseCase } from "../../../application/use-cases/analytics/GetEventAttemptsUseCase";
import { GetDestinationAttemptsUseCase } from "../../../application/use-cases/analytics/GetDestinationAttemptsUseCase";

export class AnalyticsController {
  constructor(
    private readonly getSourceEventsUseCase: GetSourceEventsUseCase,
    private readonly getEventAttemptsUseCase: GetEventAttemptsUseCase,
    private readonly getDestinationAttemptsUseCase: GetDestinationAttemptsUseCase
  ) {}

  getSourceEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const environmentId = (req as any).environment!.id;
      const { sourceId } = req.params;
      
      const cursor = (req.query.cursor as string) || null;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const page = await this.getSourceEventsUseCase.execute(environmentId, sourceId!, { cursor, limit });
      res.status(200).json(page);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  };

  getEventAttempts = async (req: Request, res: Response): Promise<void> => {
    try {
      const environmentId = (req as any).environment!.id;
      const { eventId } = req.params;

      const attempts = await this.getEventAttemptsUseCase.execute(environmentId, eventId!);
      res.status(200).json(attempts);
    } catch (error: any) {
      if (error.message.includes("not found") || error.message.includes("does not belong")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  };

  getDestinationAttempts = async (req: Request, res: Response): Promise<void> => {
    try {
      const environmentId = (req as any).environment!.id;
      const { destinationId } = req.params;
      
      const cursor = (req.query.cursor as string) || null;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const page = await this.getDestinationAttemptsUseCase.execute(environmentId, destinationId!, { cursor, limit });
      res.status(200).json(page);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  };

  getDashboardAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        totalEvents: 10,
        successfulDeliveries: 8,
        failedDeliveries: 1,
        inFlightDeliveries: 1
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
