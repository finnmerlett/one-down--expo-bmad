import { describe, expect, it } from 'bun:test';

import { isDevEnv, loadEnv } from './env';

describe('loadEnv', () => {
  it('fails fast when production has no explicit DATABASE_URL', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });

  it('accepts production with an explicit DATABASE_URL', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://app:secret@db.internal:5432/onedown',
    });

    expect(env.DATABASE_URL).toContain('db.internal');
  });

  it('defaults DATABASE_URL to the local supabase Postgres outside production', () => {
    const env = loadEnv({ NODE_ENV: 'development' });

    expect(env.DATABASE_URL).toContain('127.0.0.1:54322');
  });

  it('defaults LOG_LEVEL to info and allows debug outside production (8.3)', () => {
    expect(loadEnv({ NODE_ENV: 'development' }).LOG_LEVEL).toBe('info');
    expect(loadEnv({ NODE_ENV: 'development', LOG_LEVEL: 'debug' }).LOG_LEVEL).toBe('debug');
  });

  it('rejects LOG_LEVEL=debug in production (8.3)', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://app:secret@db.internal:5432/onedown',
        LOG_LEVEL: 'debug',
      }),
    ).toThrow(/LOG_LEVEL/);
  });
});

describe('isDevEnv', () => {
  it('is true only for explicit development or an unset NODE_ENV', () => {
    expect(isDevEnv({})).toBe(true);
    expect(isDevEnv({ NODE_ENV: 'development' })).toBe(true);
    expect(isDevEnv({ NODE_ENV: 'test' })).toBe(false);
    expect(isDevEnv({ NODE_ENV: 'production' })).toBe(false);
  });
});
