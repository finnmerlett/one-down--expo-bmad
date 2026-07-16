import { MAX_BRAIN_DUMP_CHARS, type BrainDumpResult } from '@one-down/shared';
import { z } from 'zod';

import { createAiProvider } from '../services/ai/provider';
import { publicProcedure, router } from '../trpc';

export const aiRouter = router({
  /**
   * Parse a free-form brain dump into task drafts. The client NEVER talks to
   * Gemini directly — all AI calls flow through this seam.
   *
   * publicProcedure by recorded decision: per-user metering + premium gating
   * land in Story 8.2b (the auth header already flows when a session exists).
   */
  parseBrainDump: publicProcedure
    // .trim() runs before the checks, so whitespace-only input fails min(1)
    // and length is measured on the trimmed text (>2000 chars → BAD_REQUEST).
    .input(z.object({ text: z.string().trim().min(1).max(MAX_BRAIN_DUMP_CHARS) }))
    .mutation(async ({ ctx, input }): Promise<BrainDumpResult> => {
      const { provider, name } = createAiProvider(ctx.env);

      const startedAt = Date.now();
      const tasks = await provider.parseBrainDump(input.text);

      // NFR-S3: counts + duration only — never the dump text or parsed titles.
      ctx.req.log.info(
        { provider: name, taskCount: tasks.length, durationMs: Date.now() - startedAt },
        'brain dump parsed',
      );

      return { tasks, provider: name };
    }),
});
