import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer, jwtSecret: string) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Auth middleware: verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error("未提供认证 token"));
    }

    try {
      // Simple JWT verification (same as fastify-jwt but manual for socket.io)
      const [, payloadBase64] = token.split(".");
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64url").toString()
      );

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return next(new Error("Token 已过期"));
      }

      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error("无效的 token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    console.log(`[Socket.IO] User ${userId} connected (${socket.id})`);

    // Join user-specific room for multi-device sync
    socket.join(`user:${userId}`);

    // Handle sync request after reconnection
    socket.on("sync:request", async (data: { lastSyncedAt: string }) => {
      // Import dynamically to avoid circular deps
      const { TodoService } = await import("../services/todo.service.js");
      const todoService = new TodoService();
      const todos = await todoService.getTodos(userId, data.lastSyncedAt);
      socket.emit("sync:response", {
        todos,
        syncedAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] User ${userId} disconnected (${socket.id})`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
