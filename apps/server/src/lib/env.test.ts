import { describe, expect, test } from 'bun:test';

import { loadEnv } from './env';

const validBase = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown',
  SUPABASE_JWT_SECRET: 'test-jwt-secret-value',
};

describe('loadEnv', () => {
  test('parses a valid environment with explicit values', () => {
    const env = loadEnv({
      ...validBase,
      PORT: '4000',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://example.com',
    });

    expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/onedown');
    expect(env.PORT).toBe(4000);
    expect(env.HOST).toBe('127.0.0.1');
    expect(env.NODE_ENV).toBe('production');
    expect(env.SUPABASE_JWT_SECRET).toBe('test-jwt-secret-value');
    expect(env.CORS_ORIGIN).toBe('https://example.com');
  });

  test('applies defaults for PORT, HOST, NODE_ENV, and CORS_ORIGIN', () => {
    const env = loadEnv(validBase);

    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGIN).toBe('*');
  });

  test('coerces string PORT to number', () => {
    const env = loadEnv({ ...validBase, PORT: '8080' });

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  test('throws when DATABASE_URL is missing', () => {
    expect(() => loadEnv({ SUPABASE_JWT_SECRET: 'secret' })).toThrow(/DATABASE_URL/);
  });

  test('throws when DATABASE_URL is not a URL', () => {
    expect(() => loadEnv({ ...validBase, DATABASE_URL: 'not-a-url' })).toThrow(/DATABASE_URL/);
  });

  test('throws when NODE_ENV is unsupported', () => {
    expect(() => loadEnv({ ...validBase, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  test('throws when SUPABASE_JWT_SECRET is missing', () => {
    expect(() => loadEnv({ DATABASE_URL: 'postgres://user:pass@localhost:5432/onedown' })).toThrow(
      /SUPABASE_JWT_SECRET/,
    );
  });

  test('throws when SUPABASE_JWT_SECRET is empty', () => {
    expect(() => loadEnv({ ...validBase, SUPABASE_JWT_SECRET: '' })).toThrow(/SUPABASE_JWT_SECRET/);
  });
});
