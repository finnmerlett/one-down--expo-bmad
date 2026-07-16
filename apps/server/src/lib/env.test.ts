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
});

describe('isDevEnv', () => {
  it('is true only for explicit development or an unset NODE_ENV', () => {
    expect(isDevEnv({})).toBe(true);
    expect(isDevEnv({ NODE_ENV: 'development' })).toBe(true);
    expect(isDevEnv({ NODE_ENV: 'test' })).toBe(false);
    expect(isDevEnv({ NODE_ENV: 'production' })).toBe(false);
  });
});
