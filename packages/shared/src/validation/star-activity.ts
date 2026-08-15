import { z } from 'zod';

import { STAR_ACTIONS, type StarActivityData } from '../types/star';

// Server-side input validation for star-ledger sync upserts (Story 9.7).
// `taskId` is a plain string, not uuid: local rows use '' for queue-level
// awards and null after task deletion (display reference only).
export const starActivityUpsertSchema = z.object({
  id: z.uuid(),
  taskId: z.string().nullable(),
  taskTitle: z.string(),
  action: z.enum(STAR_ACTIONS),
  amount: z.number().int(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<StarActivityData>;

export type StarActivityUpsert = z.infer<typeof starActivityUpsertSchema>;
