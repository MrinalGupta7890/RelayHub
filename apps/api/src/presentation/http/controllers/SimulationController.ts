import { Request, Response } from "express";
import { SimulateEventUseCase } from "../../../application/use-cases/simulation/SimulateEventUseCase";
import { z } from "zod";

const simulateEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  payload: z.record(z.any()).or(z.array(z.any())),
});

export class SimulationController {
  constructor(private readonly simulateEventUseCase: SimulateEventUseCase) {}

  simulate = async (req: Request, res: Response): Promise<void> => {
    try {
      const environmentId = req.params.envId as string;
      const parsed = simulateEventSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ status: "error", errors: parsed.error.errors });
        return;
      }

      const result = await this.simulateEventUseCase.execute({
        environmentId,
        eventType: parsed.data.eventType,
        payload: parsed.data.payload,
      });

      res.status(202).json({
        status: "accepted",
        eventId: result.eventId,
        sourceId: result.sourceId,
      });
    } catch (error: any) {
      if (error.message.includes("No sources found")) {
        res.status(400).json({ status: "error", message: error.message });
      } else {
        res.status(500).json({ status: "error", message: error.message });
      }
    }
  };
}
