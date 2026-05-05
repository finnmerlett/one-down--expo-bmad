import { afterEach, describe, expect, test } from 'bun:test';

import { createDbClient } from './client';

describe('createDbClient', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  test('returns a Drizzle client and a postgres handle without connecting', () => {
    const { db, sql } = createDbClient('postgres://stub:stub@127.0.0.1:5432/stub');
    cleanup = async () => {
      await sql.end({ timeout: 0 });
    };

    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
    expect(typeof sql.end).toBe('function');
  });
});
