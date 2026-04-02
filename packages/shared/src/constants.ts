// ==================== API Constants ====================

export const API_BASE = "/api/v1";

export const API_PATHS = {
  // Auth
  AUTH_REGISTER: `${API_BASE}/auth/register`,
  AUTH_LOGIN: `${API_BASE}/auth/login`,
  AUTH_REFRESH: `${API_BASE}/auth/refresh`,
  AUTH_LOGOUT: `${API_BASE}/auth/logout`,

  // Todos
  TODOS: `${API_BASE}/todos`,
  TODO_BY_ID: (id: string) => `${API_BASE}/todos/${id}`,
  TODOS_SYNC: `${API_BASE}/todos/sync`,
} as const;

// ==================== Socket Events ====================

export const SOCKET_EVENTS = {
  // Server -> Client
  TODO_CREATED: "todo:created",
  TODO_UPDATED: "todo:updated",
  TODO_DELETED: "todo:deleted",

  // Client -> Server
  SYNC_REQUEST: "sync:request",

  // Server -> Client
  SYNC_RESPONSE: "sync:response",
} as const;

// ==================== Limits ====================

export const LIMITS = {
  TODO_TITLE_MAX_LENGTH: 500,
  TODO_DESCRIPTION_MAX_LENGTH: 5000,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  MAX_TODOS_PER_USER: 1000,
} as const;
