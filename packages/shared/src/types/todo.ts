// ==================== Todo Types ====================

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  position: number;
  dueDate: string | null; // ISO timestamp, null = no due date
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  deletedAt: string | null; // ISO timestamp, null = active
}

export interface CreateTodoInput {
  id?: string; // Client-generated UUID for offline support
  title: string;
  description?: string;
  position?: number;
  dueDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  position?: number;
  dueDate?: string | null;
}

export type TodoChange = {
  id: string;
  type: "create" | "update" | "delete";
  payload: CreateTodoInput | UpdateTodoInput | null;
  timestamp: string; // ISO timestamp when the change was made
};
