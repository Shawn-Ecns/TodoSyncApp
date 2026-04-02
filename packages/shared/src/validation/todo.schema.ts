import { z } from "zod";

export const createTodoSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "标题不能为空").max(500, "标题最多500字"),
  description: z.string().max(5000, "描述最多5000字").optional(),
  position: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(500, "标题最多500字").optional(),
  description: z.string().max(5000, "描述最多5000字").nullable().optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const todoChangeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["create", "update", "delete"]),
  payload: z.union([createTodoSchema, updateTodoSchema, z.null()]),
  timestamp: z.string().datetime(),
});
