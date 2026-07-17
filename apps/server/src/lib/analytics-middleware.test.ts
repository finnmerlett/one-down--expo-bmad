import { afterAll, beforeEach, describe, expect, it } from 'bun:test';

import { buildServer } from '../index';
import { loadEnv } from './env';
import type { ServerAnalytics } from './posthog';

// Integration through the REAL stack (Fastify adapter → context → base
// procedure middleware): a fake ServerAnalytics records captures — this tests
// OUR middleware logic, not a mock wall.

interface Captured {
  distinctId: string;
  event: string;
  properties: Record<string, string | number | boolean | null>;
}

const captured: Captured[] = [];
const fakeAnalytics: ServerAnalytics = {
  capture: (distinctId, event, properties) => {
    captured.push({ distinctId, event, properties });
  },
  shutdown: () => Promise.resolve(),
};

// No POSTHOG_API_KEY / GEMINI_API_KEY: analytics comes from the injected
// fake; the AI router runs its deterministic fake provider. Placeholder
// DATABASE_URL — nothing here touches the db.
const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://placeholder:placeholder@placeholder.invalid:5432/placeholder',
});
const app = buildServer(env, { analytics: fakeAnalytics });

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  captured.length = 0;
});

describe('tRPC analytics middleware', () => {
  it('captures trpc_procedure_completed with path, type, and numeric duration', async () => {
    const response = await app.inject({ method: 'GET', url: '/trpc/health' });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    const [event] = captured;
    expect(event?.distinctId).toBe('anonymous');
    expect(event?.event).toBe('trpc_procedure_completed');
    expect(event?.properties.procedure).toBe('health');
    expect(event?.properties.procedure_type).toBe('query');
    expect(typeof event?.properties.duration_ms).toBe('number');
    expect(event?.properties.code).toBeUndefined();
  });

  it('captures trpc_procedure_failed with the error code on invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/trpc/ai.parseBrainDump',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ text: '' }),
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(captured).toHaveLength(1);
    const [event] = captured;
    expect(event?.event).toBe('trpc_procedure_failed');
    expect(event?.properties.procedure).toBe('ai.parseBrainDump');
    expect(event?.properties.procedure_type).toBe('mutation');
    expect(event?.properties.code).toBe('BAD_REQUEST');
    expect(typeof event?.properties.duration_ms).toBe('number');
  });

  it('never captures procedure input payloads (NFR-S3 by construction)', async () => {
    const sentinel = 'SENTINEL-task-text-must-never-leak';
    const response = await app.inject({
      method: 'POST',
      url: '/trpc/ai.parseBrainDump',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ text: sentinel }),
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    expect(JSON.stringify(captured)).not.toContain(sentinel);
  });
});

describe('no-op analytics (no POSTHOG_API_KEY, nothing injected)', () => {
  it('procedures still succeed through the default no-op stub', async () => {
    const noopApp = buildServer(env);
    try {
      const response = await noopApp.inject({ method: 'GET', url: '/trpc/health' });
      expect(response.statusCode).toBe(200);
    } finally {
      await noopApp.close();
    }
  });
});
