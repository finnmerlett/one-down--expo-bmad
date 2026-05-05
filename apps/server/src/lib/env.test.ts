import { describe, expect, test } from 'bun:test';

import { loadEnv } from './env';

describe('loadEnv', () => {
  test('parses a valid environment with explicit values', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown',
      PORT: '4000',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
    });

    expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/onedown');
    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.NODE_ENV).toBe('production');
  });

  test('applies defaults for PORT, HOST, and NODE_ENV', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown',
    });

    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.NODE_ENV).toBe('development');
  });

  test('coerces string PORT to number', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown',
      PORT: '8080',
    });

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  test('throws when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  test('throws when DATABASE_URL is not a URL', () => {
    expect(() => loadEnv({ DATABASE_URL: 'not-a-url' })).toThrow(/DATABASE_URL/);
  });

  test('throws when NODE_ENV is unsupported', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown',
        NODE_ENV: 'staging',
      }),
    ).toThrow(/NODE_ENV/);
  });
});
