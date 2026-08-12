import { z } from 'zod';

import { TASK_CRITICALITIES, TASK_SIZES, TASK_STATUSES, type TaskData } from '../types/task';

// Server-side input validation for sync upserts (Story 5.3). Hand-written to
// match TaskData exactly — the `satisfies` check below fails to compile if
// either side drifts. Server input is the source of truth: anything a client
// pushes must parse through this before touching Postgres.
export const taskUpsertSchema = z.object({
  // uuid-checked: the pg column is a real `uuid`, so reject bad ids here with
  // a clean BAD_REQUEST instead of a low-level database error.
  id: z.uuid(),
  title: z.string().min(1),
  details: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
  size: z.enum(TASK_SIZES).nullable(),
  // default(null): pre-criticality clients (9-5 item 15) omit the key —
  // their pushes must keep validating until every install is updated.
  criticality: z.enum(TASK_CRITICALITIES).nullable().default(null),
  contexts: z.string().nullable(),
  deadline: z.date().nullable(),
  hasCheckNeeded: z.boolean(),
  reviewFlags: z.string().nullable(),
  skipCount: z.number().int().min(0),
  skipWindowStartedAt: z.date().nullable(),
  lastEngagedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<TaskData>;

export type TaskUpsert = z.infer<typeof taskUpsertSchema>;
