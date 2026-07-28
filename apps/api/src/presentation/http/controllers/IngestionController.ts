import { Request, Response } from "express";
import { IngestEventUseCase } from "../../../application/use-cases/ingestion/IngestEventUseCase";
import crypto from "crypto";

export class IngestionController {
  constructor(private readonly ingestEventUseCase: IngestEventUseCase) {}

  ingest = async (req: Request, res: Response) => {
    try {
      const ingestionSlug = req.params.slug;
      if (!ingestionSlug) {
        return res.status(400).json({ error: "Missing ingestion slug" });
      }

      const rawPayload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
      
      // Determine signature header
      const signatureHeader = req.headers["x-signature"] 
        || req.headers["stripe-signature"] 
        || req.headers["x-hub-signature-256"] 
        || req.headers["x-svix-signature"] 
        || null;

      // Ensure headers are Record<string, string>
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(",");
        }
      }

      // Try to guess eventType, fallback to a default
      let eventType = "unknown";
      if (req.body && req.body.type && typeof req.body.type === "string") {
        eventType = req.body.type;
      } else if (headers["x-github-event"]) {
        eventType = headers["x-github-event"];
      }

      const correlationId = crypto.randomUUID();

      const result = await this.ingestEventUseCase.execute({
        ingestionSlug,
        rawPayload,
        headers,
        signatureHeader: typeof signatureHeader === "string" ? signatureHeader : null,
        correlationId,
        eventType,
      });

      if (result.status === "deduplicated") {
        res.status(200).json({ status: "deduplicated", eventId: result.eventId });
      } else {
        res.status(202).json({ status: "accepted", eventId: result.eventId });
      }
    } catch (e: any) {
      if (e.message === "Source not found") {
        res.status(404).json({ error: e.message });
      } else if (e.message === "Invalid signature") {
        res.status(401).json({ error: e.message });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  };
}
