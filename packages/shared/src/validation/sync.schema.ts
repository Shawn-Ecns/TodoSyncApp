import { z } from "zod";
import { todoChangeSchema } from "./todo.schema.js";

export const syncRequestSchema = z.object({
  lastSyncedAt: z.string().datetime(),
  changes: z.array(todoChangeSchema),
});
