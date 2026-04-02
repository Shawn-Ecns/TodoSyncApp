// ==================== Sync Types ====================

import type { Todo, TodoChange } from "./todo.js";

export interface SyncRequest {
  lastSyncedAt: string; // ISO timestamp
  changes: TodoChange[];
}

export interface SyncResponse {
  todos: Todo[];
  syncedAt: string; // ISO timestamp - use as next lastSyncedAt
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  todoId: string;
  clientTimestamp: string;
  serverTimestamp: string;
  resolution: "server_wins" | "client_wins";
}
