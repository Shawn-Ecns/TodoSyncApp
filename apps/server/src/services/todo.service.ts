import { prisma } from "../lib/prisma.js";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@todo-sync/shared";

function toTodoResponse(todo: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  completed: boolean;
  position: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Todo {
  return {
    id: todo.id,
    userId: todo.userId,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    position: todo.position,
    dueDate: todo.dueDate?.toISOString() ?? null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    deletedAt: todo.deletedAt?.toISOString() ?? null,
  };
}

export class TodoService {
  async getTodos(userId: string, since?: string, from?: string, to?: string): Promise<Todo[]> {
    if (since) {
      const todos = await prisma.todo.findMany({
        where: {
          userId,
          updatedAt: { gt: new Date(since) },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      return todos.map(toTodoResponse);
    }

    // Date range filter for calendar view
    const dateFilter = from && to ? {
      dueDate: { gte: new Date(from), lte: new Date(to) },
    } : {};

    const todos = await prisma.todo.findMany({
      where: {
        userId,
        deletedAt: null,
        ...dateFilter,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return todos.map(toTodoResponse);
  }

  async createTodo(userId: string, input: CreateTodoInput): Promise<Todo> {
    let position = input.position;
    if (position === undefined) {
      const lastTodo = await prisma.todo.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { position: "desc" },
      });
      position = (lastTodo?.position ?? -1) + 1;
    }

    const todo = await prisma.todo.create({
      data: {
        id: input.id,
        userId,
        title: input.title,
        description: input.description ?? null,
        position,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });
    return toTodoResponse(todo);
  }

  async updateTodo(
    userId: string,
    todoId: string,
    input: UpdateTodoInput
  ): Promise<Todo> {
    const existing = await prisma.todo.findFirst({
      where: { id: todoId, userId, deletedAt: null },
    });
    if (!existing) {
      throw { statusCode: 404, message: "Todo 不存在" };
    }

    const todo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.completed !== undefined && { completed: input.completed }),
        ...(input.position !== undefined && { position: input.position }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate ? new Date(input.dueDate) : null }),
      },
    });
    return toTodoResponse(todo);
  }

  async deleteTodo(userId: string, todoId: string): Promise<Todo> {
    const existing = await prisma.todo.findFirst({
      where: { id: todoId, userId, deletedAt: null },
    });
    if (!existing) {
      throw { statusCode: 404, message: "Todo 不存在" };
    }

    const todo = await prisma.todo.update({
      where: { id: todoId },
      data: { deletedAt: new Date() },
    });
    return toTodoResponse(todo);
  }
}
