import { afterAll, describe, expect, it } from 'bun:test';

import { MAX_BRAIN_DUMP_CHARS } from '@one-down/shared';

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
