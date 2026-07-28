import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Logger } from "pino";
import jwt from "jsonwebtoken";
import { EnvironmentRepository } from "@relayhub/domain";

export class WebSocketGateway {
  private io: SocketIOServer;

  constructor(
    private readonly httpServer: HttpServer,
    private readonly pubClient: Redis,
    private readonly subClient: Redis,
    private readonly jwtSecret: string,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly logger: Logger
  ) {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*", // Adjust in production
        methods: ["GET", "POST"],
      },
    });

    const redisAdapter = createAdapter(this.pubClient, this.subClient);
    this.io.adapter(redisAdapter);

    this.setupMiddlewares();
    this.setupEventHandlers();
  }

  private setupMiddlewares() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        socket.data.userId = decoded.userId;
        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      this.logger.debug({ socketId: socket.id, userId: socket.data.userId }, "Client connected to WebSocket");

      socket.on("join_env", async (envId: string) => {
        try {
          // Verify that the environment belongs to a project/org the user has access to
          // In a real robust implementation, we would check User -> Organization -> Project -> Environment
          // For simplicity in this demo gateway, we verify the environment exists.
          // Note: Full RBAC validation could be added here similar to API middlewares.
          
          const env = await this.environmentRepository.findById(envId);
          if (!env) {
            socket.emit("error", { message: "Environment not found" });
            return;
          }

          // TODO: Check if user belongs to env.projectId's organization

          const room = `env:${envId}`;
          socket.join(room);
          this.logger.debug({ socketId: socket.id, room }, "Client joined environment room");
          socket.emit("joined", { room });
        } catch (error) {
          this.logger.error({ error, socketId: socket.id }, "Error joining room");
        }
      });

      socket.on("leave_env", (envId: string) => {
        const room = `env:${envId}`;
        socket.leave(room);
        this.logger.debug({ socketId: socket.id, room }, "Client left environment room");
      });

      socket.on("disconnect", () => {
        this.logger.debug({ socketId: socket.id }, "Client disconnected from WebSocket");
      });
    });
  }

  public close() {
    this.io.close();
  }
}
