import type {
  AiProviderName,
  BreakdownMode,
  MoreStepsMode,
  ParsedTaskDraft,
} from '@one-down/shared';

import type { Env } from '../../lib/env';
import { createFakeProvider } from './fake-provider';
import { createGeminiProvider } from './gemini-provider';

/** The task fields every task-scoped AI call carries as prompt context. */
export interface TaskPromptContext {
  title: string;
  details: string | null;
  notes: string | null;
}

/** Provider-level input for a task breakdown (Story 6.3). */
export interface BreakdownTaskInput extends TaskPromptContext {
  mode: BreakdownMode;
}

/** One existing subtask, as sent to a refine call (Story 6.4). */
export interface RefineSubtask {
  title: string;
  completed: boolean;
}

/** Provider-level input for a breakdown refine (Story 6.4). */
export interface RefineBreakdownInput extends TaskPromptContext {
  feedback: string;
  subtasks: RefineSubtask[];
}

/** Provider-level result of a refine — the router adds the provider name. */
export interface RefineBreakdownOutput {
  steps: string[];
  notesDistillation: string | null;
}

/** Provider-level input for Get more steps (v1.5 D4) — refine sans feedback. */
export interface MoreStepsInput extends TaskPromptContext {
  subtasks: RefineSubtask[];
}

/** Provider-level result of Get more steps — the router adds the provider. */
export interface MoreStepsOutput {
  steps: string[];
  mode: MoreStepsMode;
}

/**
 * The AI backend seam. Later stories add methods to this same interface so
 * both providers stay drop-in interchangeable.
 */
export interface AiProvider {
  parseBrainDump(text: string): Promise<ParsedTaskDraft[]>;
  /** Break a task into concrete steps — 3 starters or a full 5–8 step list. */
  breakdownTask(input: BreakdownTaskInput): Promise<string[]>;
  /**
   * Rework a breakdown from user feedback: replacement steps for the
   * UNCOMPLETED portion (completed subtasks are kept, never regenerated)
   * plus a distillation of durable facts from the feedback (or null).
   */
  refineBreakdown(input: RefineBreakdownInput): Promise<RefineBreakdownOutput>;
  /**
   * Grow a breakdown (v1.5 D4): three next steps appended after the existing
   * list, OR — when the uncompleted steps already finish the task — a
   * subdivision of the remaining steps that replaces the uncompleted portion.
   */
  moreSteps(input: MoreStepsInput): Promise<MoreStepsOutput>;
  /** One tiny physical first step for a task the user keeps skipping (FR39). */
  suggestMicroTask(input: TaskPromptContext): Promise<string>;
}

export interface SelectedAiProvider {
  provider: AiProvider;
  name: AiProviderName;
}

/**
 * Single provider-selection point: Gemini when a key is configured, the
 * deterministic fake otherwise (AC6 — local mode / E2E have NO client-visible
 * difference beyond the echoed provider name).
 */
export function createAiProvider(env: Env): SelectedAiProvider {
  if (env.GEMINI_API_KEY) {
    return { provider: createGeminiProvider(env.GEMINI_API_KEY), name: 'gemini' };
  }
  return { provider: createFakeProvider(), name: 'fake' };
}
