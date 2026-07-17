import { describe, expect, it } from 'bun:test';

import {
  MAX_BREAKDOWN_STEP_CHARS,
  MAX_BREAKDOWN_STEPS,
  MAX_NOTES_DISTILLATION_CHARS,
  MAX_PARSED_TASKS,
} from '@one-down/shared';

import {
  decodeBreakdownResponse,
  decodeMicroResponse,
  decodeModelResponse,
  decodeRefineResponse,
  mapBreakdownResponse,
  mapMicroResponse,
  mapModelResponse,
  mapRefineResponse,
} from './gemini-provider';

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

describe('mapBreakdownResponse', () => {
  it('trims steps and drops empty and non-string entries', () => {
    const steps = mapBreakdownResponse([
      '  Clear the desk  ',
      '',
      '   ',
      42,
      null,
      { step: 'nested' },
      'Open the folder',
    ]);

    expect(steps).toEqual(['Clear the desk', 'Open the folder']);
  });

  it(`truncates steps longer than ${MAX_BREAKDOWN_STEP_CHARS} chars`, () => {
    const longStep = `Sort ${'papers '.repeat(40)}into piles`;

    const steps = mapBreakdownResponse([longStep]);

    expect(steps[0]?.length).toBeLessThanOrEqual(MAX_BREAKDOWN_STEP_CHARS);
    expect(steps[0]).toBe(longStep.slice(0, MAX_BREAKDOWN_STEP_CHARS).trimEnd());
  });

  it('never splits a surrogate pair at the truncation boundary', () => {
    // An astral char (emoji) straddling the cut: code units 140 and 141.
    const step = `${'x'.repeat(MAX_BREAKDOWN_STEP_CHARS - 1)}\u{1f600}tail`;

    const steps = mapBreakdownResponse([step]);

    // The lone high surrogate is dropped, not emitted as an ill-formed string.
    expect(steps[0]).toBe('x'.repeat(MAX_BREAKDOWN_STEP_CHARS - 1));
  });

  it(`clamps output to ${MAX_BREAKDOWN_STEPS} steps`, () => {
    const raw = Array.from({ length: MAX_BREAKDOWN_STEPS + 5 }, (_, i) => `Step ${i + 1}`);

    const steps = mapBreakdownResponse(raw);

    expect(steps).toHaveLength(MAX_BREAKDOWN_STEPS);
    expect(steps.at(-1)).toBe(`Step ${MAX_BREAKDOWN_STEPS}`);
  });

  it('throws when the top-level shape is not an array (broken model contract)', () => {
    expect(() => mapBreakdownResponse({ steps: [] })).toThrow(/not a JSON array/);
    expect(() => mapBreakdownResponse('["step"]')).toThrow(/not a JSON array/);
    expect(() => mapBreakdownResponse(undefined)).toThrow(/not a JSON array/);
  });

  it('throws when no usable steps survive mapping', () => {
    expect(() => mapBreakdownResponse([])).toThrow(/no usable steps/);
    expect(() => mapBreakdownResponse(['   ', 42, null])).toThrow(/no usable steps/);
  });
});

describe('decodeBreakdownResponse', () => {
  it('decodes a valid JSON array body into steps', () => {
    expect(decodeBreakdownResponse('["Clear the desk","Open the folder"]')).toEqual([
      'Clear the desk',
      'Open the folder',
    ]);
  });

  it('replaces JSON parse failures with a generic message that never embeds the body (NFR-S3)', () => {
    // Non-JSON model output — a bare JSON.parse SyntaxError would quote a
    // fragment of this task-derived text.
    const body = 'First, call the bank about the overdraft';
    let caught: unknown;
    try {
      decodeBreakdownResponse(body);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('AI model response was not valid JSON');
  });
});

describe('mapRefineResponse', () => {
  it('maps steps and a distillation, trimming both', () => {
    const result = mapRefineResponse({
      steps: ['  Clear the desk  ', 'Open the folder'],
      notesDistillation: '  Prefers physical actions over planning  ',
    });

    expect(result).toEqual({
      steps: ['Clear the desk', 'Open the folder'],
      notesDistillation: 'Prefers physical actions over planning',
    });
  });

  it('runs steps through the breakdown tolerance layer (drop/truncate/clamp)', () => {
    const longStep = `Sort ${'papers '.repeat(40)}into piles`;
    const raw = {
      steps: [
        longStep,
        '',
        42,
        null,
        ...Array.from({ length: MAX_BREAKDOWN_STEPS + 5 }, (_, i) => `Step ${i + 1}`),
      ],
      notesDistillation: null,
    };

    const { steps } = mapRefineResponse(raw);

    expect(steps).toHaveLength(MAX_BREAKDOWN_STEPS);
    expect(steps[0]?.length).toBeLessThanOrEqual(MAX_BREAKDOWN_STEP_CHARS);
  });

  it.each([
    ['null', null],
    ['missing', undefined],
    ['empty string', ''],
    ['whitespace-only', '   '],
    ['non-string', 42],
  ] as const)('coerces a %s distillation to null', (_label, value) => {
    const raw: Record<string, unknown> = { steps: ['Clear the desk'] };
    if (value !== undefined) raw.notesDistillation = value;

    expect(mapRefineResponse(raw).notesDistillation).toBeNull();
  });

  it(`truncates the distillation to ${MAX_NOTES_DISTILLATION_CHARS} chars`, () => {
    const { notesDistillation } = mapRefineResponse({
      steps: ['Clear the desk'],
      notesDistillation: 'd'.repeat(MAX_NOTES_DISTILLATION_CHARS + 50),
    });

    expect(notesDistillation).toBe('d'.repeat(MAX_NOTES_DISTILLATION_CHARS));
  });

  it('throws when the top level has no steps array (broken model contract)', () => {
    expect(() => mapRefineResponse(['just', 'an', 'array'])).toThrow(/JSON object/);
    expect(() => mapRefineResponse({ notesDistillation: 'x' })).toThrow(/JSON object/);
    expect(() => mapRefineResponse({ steps: 'not an array' })).toThrow(/JSON object/);
    expect(() => mapRefineResponse(undefined)).toThrow(/JSON object/);
  });

  it('throws when no usable steps survive mapping', () => {
    expect(() => mapRefineResponse({ steps: [], notesDistillation: 'x' })).toThrow(
      /no usable steps/,
    );
    expect(() => mapRefineResponse({ steps: ['   ', 42] })).toThrow(/no usable steps/);
  });
});

describe('decodeRefineResponse', () => {
  it('decodes a valid JSON object body', () => {
    const result = decodeRefineResponse('{"steps":["Clear the desk"],"notesDistillation":null}');

    expect(result).toEqual({ steps: ['Clear the desk'], notesDistillation: null });
  });

  it('replaces JSON parse failures with a generic message that never embeds the body (NFR-S3)', () => {
    // Non-JSON model output — a bare JSON.parse SyntaxError would quote a
    // fragment of this feedback-derived text.
    const body = 'The user is behind on their rent paperwork';
    let caught: unknown;
    try {
      decodeRefineResponse(body);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('AI model response was not valid JSON');
  });
});

describe('mapMicroResponse', () => {
  it('trims the step', () => {
    expect(mapMicroResponse({ step: '  Pick up one envelope  ' })).toBe('Pick up one envelope');
  });

  it(`truncates steps longer than ${MAX_BREAKDOWN_STEP_CHARS} chars (subtask title cap)`, () => {
    const step = mapMicroResponse({ step: 'p'.repeat(MAX_BREAKDOWN_STEP_CHARS + 60) });

    expect(step).toBe('p'.repeat(MAX_BREAKDOWN_STEP_CHARS));
  });

  it('throws when the step is missing, non-string or not an object (broken model contract)', () => {
    expect(() => mapMicroResponse({})).toThrow(/step string/);
    expect(() => mapMicroResponse({ step: 42 })).toThrow(/step string/);
    expect(() => mapMicroResponse('just a string')).toThrow(/step string/);
    expect(() => mapMicroResponse(['Pick up one envelope'])).toThrow(/step string/);
    expect(() => mapMicroResponse(undefined)).toThrow(/step string/);
  });

  it('throws when the step is empty or whitespace-only', () => {
    expect(() => mapMicroResponse({ step: '' })).toThrow(/no usable step/);
    expect(() => mapMicroResponse({ step: '   ' })).toThrow(/no usable step/);
  });
});

describe('decodeMicroResponse', () => {
  it('decodes a valid JSON object body', () => {
    expect(decodeMicroResponse('{"step":"Pick up one envelope"}')).toBe('Pick up one envelope');
  });

  it('replaces JSON parse failures with a generic message that never embeds the body (NFR-S3)', () => {
    const body = 'Just start with the tax letter from HMRC';
    let caught: unknown;
    try {
      decodeMicroResponse(body);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('AI model response was not valid JSON');
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
