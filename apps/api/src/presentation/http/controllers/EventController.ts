import { Request, Response } from "express";
import { RetryEventUseCase } from "../../../application/use-cases/events/RetryEventUseCase";

export class EventController {
  constructor(
    private readonly retryEventUseCase: RetryEventUseCase
  ) {}

  retryEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const environmentId = req.params.envId as string;
      const eventId = req.params.eventId as string;

      await this.retryEventUseCase.execute(eventId, environmentId);
      res.status(202).json({ message: "Retry enqueued" });
    } catch (err: any) {
      if (err.message.includes("not found")) {
        res.status(404).json({ message: err.message });
      } else if (err.message.includes("successfully") || err.message.includes("No failed")) {
        res.status(400).json({ message: err.message });
      } else {
        console.error("Failed to retry event:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };

  listEvents = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        data: [],
        hasMore: false
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  };
}
