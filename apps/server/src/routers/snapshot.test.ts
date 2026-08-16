import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import superjson from 'superjson';

import { stateSnapshots } from '@one-down/shared/schema';

import { createDbClient } from '../db/client';
import { buildServer } from '../index';
import { loadEnv } from '../lib/env';
import { createTestUser } from '../test-utils/auth';

// Integration against the REAL local stack, same harness as sync.test.ts.
const env = loadEnv({ NODE_ENV: 'test' });
const db = createDbClient(env.DATABASE_URL);
const app = buildServer(env, { db });

const trackedUserIds: string[] = [];

async function newUser() {
  const user = await createTestUser();
  trackedUserIds.push(user.userId);
  return user;
}

afterAll(async () => {
  if (trackedUserIds.length > 0) {
    await db.delete(stateSnapshots).where(inArray(stateSnapshots.userId, trackedUserIds));
  }
  await app.close();
  await db.$client.end();
});

function save(token: string | null, payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/trpc/snapshot.save',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    payload: JSON.stringify(superjson.serialize(payload)),
  });
}

describe('snapshot.save', () => {
  it('stores the payload under the caller and returns the id', async () => {
    const user = await newUser();
    const id = randomUUID();
    const payload = JSON.stringify({ tasks: [{ id: 't1', title: 'snapshot me' }] });

    const res = await save(user.accessToken, { id, payload });
    expect(res.statusCode).toBe(200);
    expect(superjson.deserialize(JSON.parse(res.payload).result.data) as { id: string }).toEqual({
      id,
    });

    const rows = await db.select().from(stateSnapshots).where(eq(stateSnapshots.id, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(user.userId);
    expect(rows[0]!.payload).toBe(payload);
  });

  it('treats a same-id re-send as a no-op instead of erroring', async () => {
    const user = await newUser();
    const id = randomUUID();

    const first = await save(user.accessToken, { id, payload: '{"v":1}' });
    expect(first.statusCode).toBe(200);
    const second = await save(user.accessToken, { id, payload: '{"v":2}' });
    expect(second.statusCode).toBe(200);

    // First write wins — the retry did not overwrite.
    const rows = await db.select().from(stateSnapshots).where(eq(stateSnapshots.id, id));
    expect(rows[0]!.payload).toBe('{"v":1}');
  });

  it('rejects unauthenticated calls', async () => {
    const res = await save(null, { id: randomUUID(), payload: '{}' });
    expect(res.statusCode).toBe(401);
  });
});
