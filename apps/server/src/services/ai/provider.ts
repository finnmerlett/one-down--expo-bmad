import type { AiProviderName, ParsedTaskDraft } from '@one-down/shared';

import type { Env } from '../../lib/env';
import { createFakeProvider } from './fake-provider';
import { createGeminiProvider } from './gemini-provider';

/**
 * The AI backend seam. Later stories (6.3 task breakdown, …) add methods to
 * this same interface so both providers stay drop-in interchangeable.
 */
export interface AiProvider {
  parseBrainDump(text: string): Promise<ParsedTaskDraft[]>;
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
