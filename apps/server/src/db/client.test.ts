import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';

import { loadEnv } from '../lib/env';
import { createDbClient } from './client';

describe('createDbClient', () => {
  it('is side-effect free at creation — a placeholder URL must not throw or connect', async () => {
    // Port 9 (discard) — anything that eagerly connected here would fail.
    const db = createDbClient('postgresql://placeholder:placeholder@127.0.0.1:9/placeholder');

    expect(db).toBeDefined();
    await db.$client.end({ timeout: 0 });
  });

  it('runs a real query against the local Postgres (integration)', async () => {
    // Default DATABASE_URL = the local supabase stack's Postgres.
    const env = loadEnv();
    const db = createDbClient(env.DATABASE_URL);

    try {
      const rows = await db.execute(sql`select 1 as ok`);
      expect(rows[0]?.ok).toBe(1);
    } finally {
      await db.$client.end({ timeout: 0 });
    }
  });
});
