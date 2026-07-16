import { afterAll, describe, expect, it } from 'bun:test';

import {
  MAX_BRAIN_DUMP_CHARS,
  MAX_BREAKDOWN_CONTEXT_CHARS,
  MAX_BREAKDOWN_TITLE_CHARS,
} from '@one-down/shared';

import { buildServer } from '../index';
import { loadEnv } from '../lib/env';

// Explicit env source: NO GEMINI_API_KEY → the deterministic fake provider
// runs regardless of whatever the developer machine has configured.
// Placeholder DATABASE_URL — this router never touches the db.
const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://placeholder:placeholder@placeholder.invalid:5432/placeholder',
});
const app = buildServer(env);

afterAll(async () => {
  await app.close();
});

function parseBrainDump(text: string) {
  return app.inject({
    method: 'POST',
    url: '/trpc/ai.parseBrainDump',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ text }),
  });
}

function breakdownTask(payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/trpc/ai.breakdownTask',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
}

/** 18:00 local, `daysFromNow` ahead — mirrors the fake provider's deadline rule. */
function sixPmLocal(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}

describe('ai.parseBrainDump (fake mode)', () => {
  it('parses a multi-line dump into per-segment drafts with inferred fields', async () => {
    // Same input the Maestro E2E flow uses — this pins the on-wire contract.
    const response = await parseBrainDump('Call the dentist tomorrow.\nClean out the garage');

    expect(response.statusCode).toBe(200);
    const { result } = response.json();
    expect(result.data.provider).toBe('fake');
    expect(result.data.tasks).toEqual([
      {
        title: 'Call the dentist tomorrow',
        details: null,
        size: 'quick_win',
        contexts: ['phone'],
        deadline: sixPmLocal(1),
        timeSensitive: true,
      },
      {
        title: 'Clean out the garage',
        details: null,
        size: 'quick_win',
        contexts: ['home'],
        deadline: null,
        timeSensitive: false,
      },
    ]);
  });

  it('rejects empty text with BAD_REQUEST', async () => {
    const response = await parseBrainDump('');

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it('rejects whitespace-only text with BAD_REQUEST (trim runs before min)', async () => {
    const response = await parseBrainDump('   \n  ');

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it(`rejects dumps longer than ${MAX_BRAIN_DUMP_CHARS} chars with BAD_REQUEST`, async () => {
    const response = await parseBrainDump('a'.repeat(MAX_BRAIN_DUMP_CHARS + 1));

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it(`accepts a dump of exactly ${MAX_BRAIN_DUMP_CHARS} chars`, async () => {
    const response = await parseBrainDump('a'.repeat(MAX_BRAIN_DUMP_CHARS));

    expect(response.statusCode).toBe(200);
    expect(response.json().result.data.tasks).toHaveLength(1);
  });
});

describe('ai.breakdownTask (fake mode)', () => {
  it('first_steps returns the three starter steps (Maestro contract input)', async () => {
    // Same task title the Maestro E2E flow seeds — pins the on-wire contract.
    const response = await breakdownTask({
      title: 'Sort the paperwork mountain',
      mode: 'first_steps',
    });

    expect(response.statusCode).toBe(200);
    const { result } = response.json();
    expect(result.data).toEqual({
      steps: [
        'Get everything you need for "Sort the paperwork mountain" in one place',
        'Do just the first two minutes',
        'Set a 10-minute timer and keep going',
      ],
      mode: 'first_steps',
      provider: 'fake',
    });
  });

  it('full returns six steps and echoes the mode', async () => {
    const response = await breakdownTask({
      title: 'Sort the paperwork mountain',
      details: 'Three boxes of unopened post',
      notes: 'Started on the recycling pile',
      mode: 'full',
    });

    expect(response.statusCode).toBe(200);
    const { result } = response.json();
    expect(result.data.steps).toHaveLength(6);
    expect(result.data.mode).toBe('full');
    expect(result.data.provider).toBe('fake');
  });

  it('rejects an empty title with BAD_REQUEST', async () => {
    const response = await breakdownTask({ title: '', mode: 'first_steps' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it('rejects a whitespace-only title with BAD_REQUEST (trim runs before min)', async () => {
    const response = await breakdownTask({ title: '   \n ', mode: 'first_steps' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it('rejects an unknown mode with BAD_REQUEST', async () => {
    const response = await breakdownTask({ title: 'Sort the paperwork', mode: 'everything' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.data.code).toBe('BAD_REQUEST');
  });

  it(`truncates an over-length title to ${MAX_BREAKDOWN_TITLE_CHARS} chars instead of rejecting`, async () => {
    // Mobile task titles are unbounded — a BAD_REQUEST here would permanently
    // break the breakdown feature for that task, so the server truncates.
    const response = await breakdownTask({
      title: 'T'.repeat(MAX_BREAKDOWN_TITLE_CHARS + 50),
      mode: 'first_steps',
    });

    expect(response.statusCode).toBe(200);
    const { result } = response.json();
    // The fake provider interpolates the title — proves the transform ran.
    expect(result.data.steps[0]).toBe(
      `Get everything you need for "${'T'.repeat(MAX_BREAKDOWN_TITLE_CHARS)}" in one place`,
    );
  });

  it(`truncates over-length details/notes to ${MAX_BREAKDOWN_CONTEXT_CHARS} chars instead of rejecting`, async () => {
    // Working notes grow unbounded via 2.2 autosave — context is truncated,
    // never rejected.
    const response = await breakdownTask({
      title: 'Sort the paperwork mountain',
      details: 'd'.repeat(MAX_BREAKDOWN_CONTEXT_CHARS + 500),
      notes: 'n'.repeat(MAX_BREAKDOWN_CONTEXT_CHARS + 500),
      mode: 'full',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().result.data.steps).toHaveLength(6);
  });
});
