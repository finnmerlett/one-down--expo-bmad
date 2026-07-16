import { describe, expect, it } from 'bun:test';

import { MAX_PARSED_TASKS } from '@one-down/shared';

import { decodeModelResponse, mapModelResponse } from './gemini-provider';

// Pure mapping layer only — no network. The live generateContent path is
// exercised manually with a real key (out of scope for CI).
describe('mapModelResponse', () => {
  it('maps a fully populated draft, normalizing the deadline to ISO', () => {
    const drafts = mapModelResponse([
      {
        title: '  Call the dentist  ',
        details: ' mention the crown ',
        size: 'quick_win',
        contexts: ['phone'],
        deadline: '2026-07-17T18:00:00+02:00',
        timeSensitive: true,
      },
    ]);

    expect(drafts).toEqual([
      {
        title: 'Call the dentist',
        details: 'mention the crown',
        size: 'quick_win',
        contexts: ['phone'],
        deadline: new Date('2026-07-17T18:00:00+02:00').toISOString(),
        timeSensitive: true,
      },
    ]);
  });

  it('fills safe defaults when optional fields are missing', () => {
    const drafts = mapModelResponse([{ title: 'Buy milk' }]);

    expect(drafts).toEqual([
      {
        title: 'Buy milk',
        details: null,
        size: null,
        contexts: [],
        deadline: null,
        timeSensitive: false,
      },
    ]);
  });

  it('drops unknown context values and deduplicates known ones', () => {
    const drafts = mapModelResponse([
      { title: 'Fix the shelf', contexts: ['home', 'garage', 'home', 42, 'laptop'] },
    ]);

    expect(drafts[0]?.contexts).toEqual(['home', 'laptop']);
  });

  it('coerces invalid sizes, dates and details to null', () => {
    const drafts = mapModelResponse([
      { title: 'Plan the trip', size: 'enormous', deadline: 'next Tuesday-ish', details: '   ' },
    ]);

    expect(drafts[0]?.size).toBeNull();
    expect(drafts[0]?.deadline).toBeNull();
    expect(drafts[0]?.details).toBeNull();
  });

  it('treats only literal true as timeSensitive', () => {
    const drafts = mapModelResponse([
      { title: 'A', timeSensitive: 'yes' },
      { title: 'B', timeSensitive: 1 },
      { title: 'C', timeSensitive: true },
    ]);

    expect(drafts.map((d) => d.timeSensitive)).toEqual([false, false, true]);
  });

  it('skips entries without a usable title and non-object entries', () => {
    const drafts = mapModelResponse([
      { title: '   ' },
      { title: 42 },
      {},
      'just a string',
      null,
      ['nested'],
      { title: 'The only survivor' },
    ]);

    expect(drafts.map((d) => d.title)).toEqual(['The only survivor']);
  });

  it('clamps output to MAX_PARSED_TASKS entries', () => {
    const raw = Array.from({ length: MAX_PARSED_TASKS + 5 }, (_, i) => ({
      title: `Task ${i + 1}`,
    }));

    const drafts = mapModelResponse(raw);

    expect(drafts).toHaveLength(MAX_PARSED_TASKS);
    expect(drafts.at(-1)?.title).toBe(`Task ${MAX_PARSED_TASKS}`);
  });

  it('throws when the top-level shape is not an array (broken model contract)', () => {
    expect(() => mapModelResponse({ tasks: [] })).toThrow(/not a JSON array/);
    expect(() => mapModelResponse('[]')).toThrow(/not a JSON array/);
    expect(() => mapModelResponse(undefined)).toThrow(/not a JSON array/);
  });
});

describe('decodeModelResponse', () => {
  it('decodes a valid JSON array body into drafts', () => {
    const drafts = decodeModelResponse('[{"title":"Buy milk"}]');

    expect(drafts.map((d) => d.title)).toEqual(['Buy milk']);
  });

  it('replaces JSON parse failures with a generic message that never embeds the body (NFR-S3)', () => {
    // Non-JSON model output (e.g. refusal prose). A bare JSON.parse would
    // throw a SyntaxError quoting a fragment of this user-derived text.
    const body = 'Call mum about the loan, then buy milk';
    let caught: unknown;
    try {
      decodeModelResponse(body);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('AI model response was not valid JSON');
  });
});
