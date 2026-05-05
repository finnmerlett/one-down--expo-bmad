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

describe('CORS', () => {
  test('returns Access-Control-Allow-Origin header', async () => {
    const server = buildServer({ logger: false, corsOrigin: 'https://example.com' });
    const response = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://example.com' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://example.com');

    await server.close();
  });

  test('defaults to wildcard origin', async () => {
    const server = buildServer({ logger: false });
    const response = await server.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:8081' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('*');

    await server.close();
  });
});
