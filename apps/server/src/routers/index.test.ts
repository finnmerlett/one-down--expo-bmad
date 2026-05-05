import { describe, expect, test } from 'bun:test';

import { buildServer } from '../index';
import { appRouter } from './index';

describe('appRouter.health', () => {
  test('createCaller returns the expected payload shape', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('one-down-api');
    expect(result.sharedPackage).toBe('@one-down/shared');
    expect(typeof result.timestamp).toBe('string');
    expect(Number.isFinite(Date.parse(result.timestamp))).toBe(true);
  });
});

describe('GET /trpc/health (Fastify adapter)', () => {
  test('returns 200 with a tRPC-shaped response', async () => {
    const server = buildServer({ logger: false });
    const response = await server.inject({ method: 'GET', url: '/trpc/health' });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload) as {
      result: { data: { status: string; service: string; sharedPackage: string } };
    };
    expect(payload.result.data.status).toBe('ok');
    expect(payload.result.data.service).toBe('one-down-api');
    expect(payload.result.data.sharedPackage).toBe('@one-down/shared');

    await server.close();
  });
});
