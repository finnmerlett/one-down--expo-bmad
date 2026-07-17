import { describe, expect, it } from 'bun:test';

import { loadEnv } from '../../lib/env';
import { createAiProvider } from './provider';

// AC6 seam: the ONLY thing selecting real-vs-fake is GEMINI_API_KEY presence.
describe('createAiProvider', () => {
  it('selects the deterministic fake provider when GEMINI_API_KEY is absent', () => {
    const { name, provider } = createAiProvider(loadEnv({ NODE_ENV: 'test' }));

    expect(name).toBe('fake');
    expect(typeof provider.parseBrainDump).toBe('function');
    expect(typeof provider.breakdownTask).toBe('function');
    expect(typeof provider.refineBreakdown).toBe('function');
    expect(typeof provider.suggestMicroTask).toBe('function');
  });

  it('selects the gemini provider when GEMINI_API_KEY is set', () => {
    const { name, provider } = createAiProvider(
      loadEnv({ NODE_ENV: 'test', GEMINI_API_KEY: 'test-key-not-real' }),
    );

    expect(name).toBe('gemini');
    expect(typeof provider.parseBrainDump).toBe('function');
    expect(typeof provider.breakdownTask).toBe('function');
    expect(typeof provider.refineBreakdown).toBe('function');
    expect(typeof provider.suggestMicroTask).toBe('function');
  });
});
