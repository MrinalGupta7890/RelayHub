import { Request, Response } from "express";
import { ReplayEventUseCase } from "../../../application/use-cases/replay/ReplayEventUseCase";

export class ReplayController {
  constructor(private readonly replayEventUseCase: ReplayEventUseCase) {}

  replay = async (req: Request, res: Response) => {
    try {
      const environmentId = req.params.envId as string;
      const eventId = req.params.eventId as string;
      const { destinationId } = req.body;

      if (!environmentId || !eventId) {
        return res.status(400).json({ error: "environmentId and eventId parameters are required" });
      }

      await this.replayEventUseCase.execute(environmentId, eventId, destinationId);

      return res.status(202).json({ message: "Replay triggered" });
    } catch (e: any) {
      if (e.message.includes("not found")) {
        return res.status(404).json({ error: e.message });
      }
      console.error("ReplayController replay error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
