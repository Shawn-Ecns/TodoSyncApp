import type { FastifyInstance } from "fastify";
import {
  createTodoSchema,
  updateTodoSchema,
  syncRequestSchema,
} from "@todo-sync/shared";
import { TodoService } from "../services/todo.service.js";
import { SyncService } from "../services/sync.service.js";
import { authenticate } from "../middleware/authenticate.js";
import { getIO } from "../lib/socket.js";

const todoService = new TodoService();
const syncService = new SyncService();

export async function todoRoutes(app: FastifyInstance) {
  // All todo routes require authentication
  app.addHook("onRequest", authenticate);

  // Get todos (with optional incremental sync via ?since= or date range via ?from=&to=)
  app.get("/api/v1/todos", async (request, reply) => {
    const { since, from, to } = request.query as { since?: string; from?: string; to?: string };
    const todos = await todoService.getTodos(request.userId, since, from, to);
    return reply.send({ todos });
  });

  // Create todo
  app.post("/api/v1/todos", async (request, reply) => {
    const parsed = createTodoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const todo = await todoService.createTodo(request.userId, parsed.data);

    // Broadcast to other devices
    const io = getIO();
    if (io) {
      io.to(`user:${request.userId}`).except(getSocketId(request)).emit("todo:created", todo);
    }

    return reply.code(201).send({ todo });
  });

  // Update todo
  app.patch("/api/v1/todos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTodoSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const todo = await todoService.updateTodo(
        request.userId,
        id,
        parsed.data
      );

      // Broadcast to other devices
      const io = getIO();
      if (io) {
        io.to(`user:${request.userId}`).except(getSocketId(request)).emit("todo:updated", todo);
      }

      return reply.send({ todo });
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ message: err.message || "更新失败" });
    }
  });

  // Delete todo (soft delete)
  app.delete("/api/v1/todos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const todo = await todoService.deleteTodo(request.userId, id);

      // Broadcast to other devices
      const io = getIO();
      if (io) {
        io.to(`user:${request.userId}`)
          .except(getSocketId(request))
          .emit("todo:deleted", { id: todo.id, deletedAt: todo.deletedAt });
      }

      return reply.send({ todo });
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ message: err.message || "删除失败" });
    }
  });

  // Sync endpoint for offline changes
  app.post("/api/v1/todos/sync", async (request, reply) => {
    const parsed = syncRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await syncService.processSync(request.userId, parsed.data);
    return reply.send(result);
  });
}

/**
 * Extract socket ID from request header (set by client for broadcast exclusion)
 */
function getSocketId(request: { headers: Record<string, string | string[] | undefined> }): string {
  const socketId = request.headers["x-socket-id"];
  return (typeof socketId === "string" ? socketId : "") || "";
}
