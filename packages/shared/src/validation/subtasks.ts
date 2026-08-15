import { z } from 'zod';

import { SUBTASK_SOURCES, type SubtaskData } from '../types/subtask';

// Server-side input validation for subtask sync upserts (Story 9.7) — same
// contract as taskUpsertSchema: hand-written to match SubtaskData exactly,
// `satisfies` fails to compile on drift, anything pushed must parse before
// touching Postgres.
export const subtaskUpsertSchema = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  title: z.string().min(1),
  completed: z.boolean(),
  orderIndex: z.number().int(),
  source: z.enum(SUBTASK_SOURCES),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<SubtaskData>;

export type SubtaskUpsert = z.infer<typeof subtaskUpsertSchema>;
