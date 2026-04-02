import type { Todo } from "../types/todo.js";

/**
 * Sort todos by position (ascending), then by createdAt (ascending) as tiebreaker
 */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Filter out soft-deleted todos
 */
export function filterActiveTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.deletedAt === null);
}
