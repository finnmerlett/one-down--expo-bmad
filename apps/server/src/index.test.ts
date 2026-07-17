import { afterAll, describe, expect, it } from 'bun:test';

import { buildServer } from './index';
import { loadEnv } from './lib/env';

// Placeholder DATABASE_URL on purpose: the server must boot without any
// database connection being opened (postgres.js connects lazily).
const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://placeholder:placeholder@placeholder.invalid:5432/placeholder',
});
const app = buildServer(env);

afterAll(async () => {
  await app.close();
});

describe('GET /health (liveness)', () => {
  it('responds with the shared HealthStatus contract', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('one-down-api');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});

describe('tRPC health query (end-to-end)', () => {
  it('answers through the fastify adapter with the shared package echoed', async () => {
    const response = await app.inject({ method: 'GET', url: '/trpc/health' });

    expect(response.statusCode).toBe(200);
    // superjson transformer (Story 5.3): the tRPC envelope nests the payload
    // as { result: { data: { json: ... } } }.
    const body = response.json();
    expect(body.result.data.json).toMatchObject({
      status: 'ok',
      service: 'one-down-api',
      sharedPackage: '@one-down/shared',
    });
    expect(Number.isNaN(Date.parse(body.result.data.json.timestamp))).toBe(false);
  });

  it('returns NOT_FOUND for an unknown procedure', async () => {
    const response = await app.inject({ method: 'GET', url: '/trpc/nope' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.json.data.code).toBe('NOT_FOUND');
    // isDev is passed explicitly to initTRPC — outside development, error
    // payloads must never carry server stack traces (info leak).
    expect(body.error.json.data.stack).toBeUndefined();
  });
});
