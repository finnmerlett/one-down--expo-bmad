import type { AiProviderName, BreakdownMode, ParsedTaskDraft } from '@one-down/shared';

import type { Env } from '../../lib/env';
import { createFakeProvider } from './fake-provider';
import { createGeminiProvider } from './gemini-provider';

/** Provider-level input for a task breakdown (Story 6.3). */
export interface BreakdownTaskInput {
  title: string;
  details: string | null;
  notes: string | null;
  mode: BreakdownMode;
}

/**
 * The AI backend seam. Later stories add methods to this same interface so
 * both providers stay drop-in interchangeable.
 */
export interface AiProvider {
  parseBrainDump(text: string): Promise<ParsedTaskDraft[]>;
  /** Break a task into concrete steps — 3 starters or a full 5–8 step list. */
  breakdownTask(input: BreakdownTaskInput): Promise<string[]>;
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
