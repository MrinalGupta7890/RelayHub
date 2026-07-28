import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { loadApiEnv } from "../../config/env";

const env = loadApiEnv();

// Reuse or create a dedicated redis client for rate limiting
const redisClient = new Redis(env.REDIS_URL);

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0] as string, ...args.slice(1)) as any,
    prefix: "rl:auth:",
  }),
  message: {
    status: "error",
    message: "Too many authentication attempts from this IP, please try again after 15 minutes",
  },
});

export const ingestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 1 minute)
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0] as string, ...args.slice(1)) as any,
    prefix: "rl:ingest:",
  }),
  message: {
    status: "error",
    message: "Too many requests to the ingestion endpoint. Please slow down.",
  },
});
