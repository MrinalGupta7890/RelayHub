import { Response } from "express";
import { z } from "zod";
import { CreateDestinationUseCase } from "../../../application/use-cases/destinations/CreateDestinationUseCase";
import { ListDestinationsUseCase } from "../../../application/use-cases/destinations/ListDestinationsUseCase";
import { UpdateDestinationUseCase } from "../../../application/use-cases/destinations/UpdateDestinationUseCase";
import { AuthenticatedRequest } from "../middlewares/requireAuth";

const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(20),
  baseDelayMs: z.number().int().min(100),
  maxDelayMs: z.number().int().min(1000),
});

const createDestinationSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  secret: z.string().min(16).optional(),
  eventTypeFilters: z.array(z.string()).min(1),
  customHeaders: z.record(z.string()).nullable().optional(),
  retryPolicy: retryPolicySchema.optional(),
});

const updateDestinationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  eventTypeFilters: z.array(z.string()).min(1).optional(),
  customHeaders: z.record(z.string()).nullable().optional(),
  retryPolicy: retryPolicySchema.optional(),
  isActive: z.boolean().optional(),
});

export class DestinationController {
  constructor(
    private readonly createUseCase: CreateDestinationUseCase,
    private readonly listUseCase: ListDestinationsUseCase,
    private readonly updateUseCase: UpdateDestinationUseCase
  ) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const envId = req.params.envId;
      const organizationId = req.params.orgId;
      const userId = req.userId;

      if (!envId || !organizationId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const parsed = createDestinationSchema.parse(req.body);

      const result = await this.createUseCase.execute({
        environmentId: envId,
        organizationId,
        userId,
        ...parsed,
      });

      res.status(201).json({
        id: result.destination.id,
        name: result.destination.name,
        url: result.destination.url,
        eventTypeFilters: result.destination.eventTypeFilters,
        customHeaders: result.destination.customHeaders,
        retryPolicy: result.destination.retryPolicy,
        isActive: result.destination.isActive,
        createdAt: result.destination.createdAt,
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

      const destinations = await this.listUseCase.execute({ environmentId: envId });
      
      const responsePayload = destinations.map(d => ({
        id: d.id,
        name: d.name,
        url: d.url,
        eventTypeFilters: d.eventTypeFilters,
        isActive: d.isActive,
        createdAt: d.createdAt,
      }));

      res.status(200).json(responsePayload);
    } catch (e: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const destinationId = req.params.destinationId;
      const organizationId = req.params.orgId;
      const userId = req.userId;

      if (!destinationId || !organizationId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const parsed = updateDestinationSchema.parse(req.body);

      const destination = await this.updateUseCase.execute({
        id: destinationId,
        organizationId,
        userId,
        ...parsed,
      });

      res.status(200).json({
        id: destination.id,
        name: destination.name,
        url: destination.url,
        eventTypeFilters: destination.eventTypeFilters,
        customHeaders: destination.customHeaders,
        retryPolicy: destination.retryPolicy,
        isActive: destination.isActive,
        updatedAt: destination.updatedAt,
      });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: e.errors });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  };
}
