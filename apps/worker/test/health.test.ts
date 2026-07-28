import request from "supertest";
import pino from "pino";
import { createHealthServer } from "../src/health-server";

describe("GET /healthz (worker)", () => {
  const logger = pino({ level: "silent" });
  const app = createHealthServer(logger);

  it("returns 200 with a well-formed health payload", async () => {
    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "relayhub-worker",
    });
  });
});

describe("GET /readyz (worker)", () => {
  const logger = pino({ level: "silent" });

  it("returns 200 when the database check passes", async () => {
    const app = createHealthServer(logger, { checkDatabase: async () => true });
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(200);
  });

  it("returns 503 when the database check fails", async () => {
    const app = createHealthServer(logger, { checkDatabase: async () => false });
    const res = await request(app).get("/readyz");
    expect(res.status).toBe(503);
  });
});
