import {
  preferenceUpsertSchema,
  starActivityUpsertSchema,
  subtaskUpsertSchema,
  taskUpsertSchema,
} from '@one-down/shared';
import { z } from 'zod';

import {
  pullPreferences,
  pullStarActivity,
  pullSubtasks,
  pullTasks,
  pushPreferences,
  pushStarActivity,
  pushSubtasks,
  pushTasks,
} from '../services/sync-service';
import { protectedProcedure, router } from '../trpc';

const since = z.object({ since: z.date().nullable() });

// Thin transport layer — all merge logic lives in services/sync-service.ts.
// `push`/`pull` are the TASKS pair under their original Story 5.3 names:
// deployed clients call them, so they can never be renamed into the
// per-entity convention the 9.7 additions use.
export const syncRouter = router({
  push: protectedProcedure
    .input(z.object({ tasks: z.array(taskUpsertSchema).max(500) }))
    .mutation(({ ctx, input }) => pushTasks(ctx.db, ctx.userId, input.tasks)),
  pull: protectedProcedure
    .input(since)
    .query(({ ctx, input }) => pullTasks(ctx.db, ctx.userId, input.since)),
  pushSubtasks: protectedProcedure
    .input(z.object({ rows: z.array(subtaskUpsertSchema).max(500) }))
    .mutation(({ ctx, input }) => pushSubtasks(ctx.db, ctx.userId, input.rows)),
  pullSubtasks: protectedProcedure
    .input(since)
    .query(({ ctx, input }) => pullSubtasks(ctx.db, ctx.userId, input.since)),
  pushStarActivity: protectedProcedure
    .input(z.object({ rows: z.array(starActivityUpsertSchema).max(500) }))
    .mutation(({ ctx, input }) => pushStarActivity(ctx.db, ctx.userId, input.rows)),
  pullStarActivity: protectedProcedure
    .input(since)
    .query(({ ctx, input }) => pullStarActivity(ctx.db, ctx.userId, input.since)),
  pushPreferences: protectedProcedure
    .input(z.object({ rows: z.array(preferenceUpsertSchema).max(500) }))
    .mutation(({ ctx, input }) => pushPreferences(ctx.db, ctx.userId, input.rows)),
  pullPreferences: protectedProcedure
    .input(since)
    .query(({ ctx, input }) => pullPreferences(ctx.db, ctx.userId, input.since)),
});
