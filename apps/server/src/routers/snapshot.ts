import { stateSnapshots } from '@one-down/shared/schema';
import { z } from 'zod';

import { protectedProcedure, router } from '../trpc';

// Debugging seam (Story 9.8 F3): the client uploads a JSON dump of its whole
// local DB and keeps the uuid as the reference to hand over when reporting a
// bug. Write-once, human-read-only (psql) — deliberately NOT part of the sync
// engine (9.7 sync-complexity freeze). The 4 MB cap comfortably clears a
// single-user dump (the real account is ~100s of rows) while bounding abuse.
export const snapshotRouter = router({
  save: protectedProcedure
    .input(z.object({ id: z.uuid(), payload: z.string().max(4_000_000) }))
    .mutation(async ({ ctx, input }) => {
      // Same-id retry (e.g. flaky network re-send) is a no-op, not an error.
      await ctx.db
        .insert(stateSnapshots)
        .values({ id: input.id, userId: ctx.userId, payload: input.payload })
        .onConflictDoNothing();
      return { id: input.id };
    }),
});
