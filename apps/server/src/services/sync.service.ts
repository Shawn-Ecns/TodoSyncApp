import { prisma } from "../lib/prisma.js";
import type {
  Todo,
  SyncRequest,
  SyncResponse,
  SyncConflict,
} from "@todo-sync/shared";
import { TodoService } from "./todo.service.js";

const todoService = new TodoService();

export class SyncService {
  /**
   * Process offline changes from a client and return the merged state
   */
  async processSync(
    userId: string,
    request: SyncRequest
  ): Promise<SyncResponse> {
    const conflicts: SyncConflict[] = [];
    const syncedAt = new Date().toISOString();

    // Process each client change
    for (const change of request.changes) {
      try {
        switch (change.type) {
          case "create": {
            if (!change.payload) break;
            // Check if todo already exists (idempotency)
            const existing = await prisma.todo.findUnique({
              where: { id: change.id },
            });
            if (!existing) {
              const p = change.payload as Record<string, unknown>;
              await todoService.createTodo(userId, {
                id: change.id,
                title: (p.title as string) ?? "",
                description: p.description as string | undefined,
                position: p.position as number | undefined,
              });
            }
            break;
          }
          case "update": {
            if (!change.payload) break;
            const existing = await prisma.todo.findFirst({
              where: { id: change.id, userId },
            });
            if (existing) {
              // Conflict check: if server version is newer, server wins
              if (
                existing.updatedAt > new Date(change.timestamp)
              ) {
                conflicts.push({
                  todoId: change.id,
                  clientTimestamp: change.timestamp,
                  serverTimestamp: existing.updatedAt.toISOString(),
                  resolution: "server_wins",
                });
              } else {
                await todoService.updateTodo(userId, change.id, change.payload);
              }
            }
            break;
          }
          case "delete": {
            const existing = await prisma.todo.findFirst({
              where: { id: change.id, userId, deletedAt: null },
            });
            if (existing) {
              await todoService.deleteTodo(userId, change.id);
            }
            break;
          }
        }
      } catch {
        // Skip individual change errors, continue processing
      }
    }

    // Return all changes since lastSyncedAt
    const todos = await todoService.getTodos(userId, request.lastSyncedAt);

    return { todos, syncedAt, conflicts };
  }
}
