import {
  BREAKDOWN_MODES,
  MAX_BRAIN_DUMP_CHARS,
  MAX_BREAKDOWN_CONTEXT_CHARS,
  MAX_BREAKDOWN_TITLE_CHARS,
  type BrainDumpResult,
  type BreakdownResult,
} from '@one-down/shared';
import { z } from 'zod';

import { truncateChars } from '../lib/text';
import { createAiProvider } from '../services/ai/provider';
import { publicProcedure, router } from '../trpc';

// Breakdown fields are prompt CONTEXT, not stored data — over-length input is
// truncated, never rejected. Mobile task fields are unbounded, so a max() here
// would turn one long title / pile of working notes into a permanent
// BAD_REQUEST that no retry can fix (the caps are exported from
// packages/shared so the client can clamp before sending too).
const breakdownContextField = z
  .string()
  .nullish()
  .transform((value) => (value ? truncateChars(value, MAX_BREAKDOWN_CONTEXT_CHARS) : null));

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

  /**
   * Break a task into concrete steps (Story 6.3). Nothing is persisted
   * server-side — the client saves accepted steps as local subtasks.
   * `mode: 'first_steps'` returns just enough to get moving (FR40 default);
   * 'full' returns the complete list ("Show all steps").
   *
   * publicProcedure by the same recorded 6.1 decision — gating lands in 8.2b.
   */
  breakdownTask: publicProcedure
    .input(
      z.object({
        // Empty/whitespace title is still BAD_REQUEST (a client bug, not user
        // data); over-length fields are truncated — see breakdownContextField.
        title: z
          .string()
          .trim()
          .min(1)
          .transform((value) => truncateChars(value, MAX_BREAKDOWN_TITLE_CHARS)),
        details: breakdownContextField,
        notes: breakdownContextField,
        mode: z.enum(BREAKDOWN_MODES),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<BreakdownResult> => {
      const { provider, name } = createAiProvider(ctx.env);

      const startedAt = Date.now();
      const steps = await provider.breakdownTask({
        title: input.title,
        details: input.details,
        notes: input.notes,
        mode: input.mode,
      });

      // NFR-S3: counts + duration only — never the task text or step text.
      ctx.req.log.info(
        {
          provider: name,
          mode: input.mode,
          stepCount: steps.length,
          durationMs: Date.now() - startedAt,
        },
        'task breakdown generated',
      );

      return { steps, mode: input.mode, provider: name };
    }),
});
