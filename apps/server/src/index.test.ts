import { describe, expect, test } from 'bun:test';

import { buildServer } from './index';

describe('health route', () => {
  test('returns an ok response', async () => {
    const server = buildServer({ logger: false });
    const response = await server.inject({ method: 'GET', url: '/health' });
    const payload = JSON.parse(response.payload) as {
      service: string;
      sharedPackage: string;
      status: string;
    };

    expect(response.statusCode).toBe(200);
    expect(payload).toEqual({
      service: 'one-down-api',
      sharedPackage: '@one-down/shared',
      status: 'ok',
    });

    await server.close();
  });
});
