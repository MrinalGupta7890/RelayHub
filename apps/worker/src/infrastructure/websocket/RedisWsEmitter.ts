import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import { WsEmitterService, DeliveryStatus } from "@relayhub/domain";

export class RedisWsEmitter implements WsEmitterService {
  private emitter: Emitter;

  constructor(redisClient: Redis) {
    this.emitter = new Emitter(redisClient);
  }

  async emitEventIngested(environmentId: string, eventId: string): Promise<void> {
    this.emitter.to(`env:${environmentId}`).emit("event.ingested", {
      eventId,
      environmentId,
      timestamp: new Date().toISOString(),
    });
  }

  async emitDeliveryUpdated(
    environmentId: string,
    eventId: string,
    deliveryAttemptId: string,
    status: DeliveryStatus
  ): Promise<void> {
    this.emitter.to(`env:${environmentId}`).emit("delivery.updated", {
      eventId,
      deliveryAttemptId,
      environmentId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
