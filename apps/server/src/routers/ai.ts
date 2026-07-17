import {
  BREAKDOWN_MODES,
  MAX_BRAIN_DUMP_CHARS,
  MAX_BREAKDOWN_CONTEXT_CHARS,
  MAX_BREAKDOWN_STEP_CHARS,
  MAX_BREAKDOWN_TITLE_CHARS,
  MAX_REFINE_FEEDBACK_CHARS,
  MAX_REFINE_SUBTASKS,
  type BrainDumpResult,
  type BreakdownResult,
  type MicroTaskResult,
  type RefineBreakdownResult,
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

// Same rationale for the task title: empty/whitespace is a client bug
// (BAD_REQUEST), over-length is truncated.
const taskTitleField = z
  .string()
  .trim()
  .min(1)
  .transform((value) => truncateChars(value, MAX_BREAKDOWN_TITLE_CHARS));

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
        title: taskTitleField,
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

  /**
   * Refine an existing breakdown from user feedback (Story 6.4). Returns
   * replacement steps for the UNCOMPLETED portion plus a distillation of
   * durable facts from the feedback (the client appends it to the task's
   * notes). Nothing is persisted server-side — the client swaps its local
   * uncompleted subtasks on accept.
   *
   * publicProcedure by the same recorded 6.1 decision — gating lands in 8.2b.
   */
  refineBreakdown: publicProcedure
    .input(
      z.object({
        title: taskTitleField,
        details: breakdownContextField,
        notes: breakdownContextField,
        // Feedback comes from a BOUNDED client-owned input (unlike the
        // unbounded task fields) — empty and over-length are both client
        // bugs, so they are REJECTED rather than truncated.
        feedback: z.string().trim().min(1).max(MAX_REFINE_FEEDBACK_CHARS),
        subtasks: z
          .array(
            z.object({
              // Subtask titles are prompt context — truncate, never reject.
              title: z
                .string()
                .transform((value) => truncateChars(value, MAX_BREAKDOWN_STEP_CHARS)),
              completed: z.boolean(),
            }),
          )
          .max(MAX_REFINE_SUBTASKS),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<RefineBreakdownResult> => {
      const { provider, name } = createAiProvider(ctx.env);

      const startedAt = Date.now();
      const { steps, notesDistillation } = await provider.refineBreakdown({
        title: input.title,
        details: input.details,
        notes: input.notes,
        feedback: input.feedback,
        subtasks: input.subtasks,
      });

      // NFR-S3: counts + flags only — never task text, feedback, steps or
      // the distillation.
      ctx.req.log.info(
        {
          provider: name,
          stepCount: steps.length,
          subtaskCount: input.subtasks.length,
          hasDistillation: notesDistillation !== null,
          durationMs: Date.now() - startedAt,
        },
        'breakdown refined',
      );

      return { steps, notesDistillation, provider: name };
    }),

  /**
   * Suggest one tiny first step for a task the user keeps skipping
   * (Story 6.4, FR39 — the "Stuck on this?" nudge). Nothing is persisted
   * server-side — the client saves an accepted step as one local subtask.
   *
   * publicProcedure by the same recorded 6.1 decision — gating lands in 8.2b.
   */
  suggestMicroTask: publicProcedure
    .input(
      z.object({
        title: taskTitleField,
        details: breakdownContextField,
        notes: breakdownContextField,
      }),
    )
    .mutation(async ({ ctx, input }): Promise<MicroTaskResult> => {
      const { provider, name } = createAiProvider(ctx.env);

      const startedAt = Date.now();
      const step = await provider.suggestMicroTask({
        title: input.title,
        details: input.details,
        notes: input.notes,
      });

      // NFR-S3: provider + duration only — never the task text or the step.
      ctx.req.log.info(
        { provider: name, durationMs: Date.now() - startedAt },
        'micro task suggested',
      );

      return { step, provider: name };
    }),
});
