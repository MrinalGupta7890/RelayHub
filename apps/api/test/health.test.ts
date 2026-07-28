import request from "supertest";
import pino from "pino";
import { createApp } from "../src/app";

describe("GET /healthz", () => {
  // Silent logger for tests — avoids noisy pino-http output in CI while
  // still exercising the real logging middleware wiring.
  const logger = pino({ level: "silent" });
  const app = createApp(logger);

  it("returns 200 with a well-formed health payload", async () => {
    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "relayhub-api",
    });
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });

  it("sets security headers via helmet", async () => {
    const res = await request(app).get("/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("GET /readyz", () => {
  const logger = pino({ level: "silent" });

  it("returns 200 when the database check passes", async () => {
    const app = createApp(logger, { checkDatabase: async () => true });
    const res = await request(app).get("/readyz");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", checks: { database: "up" } });
  });

  it("returns 503 when the database check fails", async () => {
    const app = createApp(logger, { checkDatabase: async () => false });
    const res = await request(app).get("/readyz");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "down", checks: { database: "down" } });
  });
});
