import { taskUpsertSchema } from '@one-down/shared';
import { z } from 'zod';

import { pullTasks, pushTasks } from '../services/sync-service';
import { protectedProcedure, router } from '../trpc';

// Thin transport layer — all merge logic lives in services/sync-service.ts.
export const syncRouter = router({
  push: protectedProcedure
    .input(z.object({ tasks: z.array(taskUpsertSchema).max(500) }))
    .mutation(({ ctx, input }) => pushTasks(ctx.db, ctx.userId, input.tasks)),
  pull: protectedProcedure
    .input(z.object({ since: z.date().nullable() }))
    .query(({ ctx, input }) => pullTasks(ctx.db, ctx.userId, input.since)),
});
