import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { createServer } from "node:http";
import { authRoutes } from "./routes/auth.js";
import { todoRoutes } from "./routes/todos.js";
import { initSocketIO } from "./lib/socket.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function main() {
  const app = Fastify({
    logger: true,
  });

  // Plugins
  await app.register(cors, {
    origin: true, // Allow all origins in dev
    credentials: true,
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
  });

  // Health check
  app.get("/api/v1/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(todoRoutes);

  // Start server
  await app.listen({ port: PORT, host: "0.0.0.0" });

  // Initialize Socket.IO on the underlying http server
  const httpServer = app.server;
  initSocketIO(httpServer, JWT_SECRET);

  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
