/**
 * Dev-only task seeding through the sync stack (2026-08-11, 9-5 request):
 * ensures a fixed test account exists in supabase-local, WIPES its server
 * tasks, and inserts a fixture set — so the app (or a Maestro flow) just
 * signs in and pulls the exact state under test. No more hand-tapping seed
 * tasks through the UI, no duplication between flows.
 *
 *   bun run seed:test-account            # default fixture set
 *   bun run seed:test-account -- --empty # account with zero tasks
 *
 * Sign in as:  seed@test.local / seed-password-123
 *
 * LOCAL ONLY: talks to the supabase-local admin API with the publicly-known
 * supabase-demo service-role key (a constant of the local stack, not a
 * secret — same standing as the demo anon key baked into the app). Sync is
 * tasks-only (Story 5.3), so fixtures carry no subtask rows.
 */
import { eq, sql } from 'drizzle-orm';

import type { TaskData } from '@one-down/shared';
import { tasks } from '@one-down/shared/schema';

import { createDbClient } from '../src/db/client';

const SUPABASE_URL = process.env.SUPABASE_SEED_URL ?? 'http://127.0.0.1:54321';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  // supabase-local demo service_role JWT — public constant of the local stack.
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const SEED_EMAIL = 'seed@test.local';
export const SEED_PASSWORD = 'seed-password-123';

const DAY_MS = 86_400_000;

/** Fixture set: one of each shape the app distinguishes. Deadlines are
 *  relative to seed time so bonus windows / overdue states hold whenever
 *  the script runs. */
function defaultFixtures(now: Date): TaskData[] {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS);
  const inDays = (days: number) => new Date(now.getTime() + days * DAY_MS);
  const base = {
    details: null,
    notes: null,
    criticality: null,
    contexts: null,
    deadline: null,
    hasCheckNeeded: false,
    reviewFlags: null,
    skipCount: 0,
    skipWindowStartedAt: null,
  };
  return [
    {
      ...base,
      id: crypto.randomUUID(),
      title: 'Seeded quick win',
      status: 'pending',
      size: 'quick_win',
      lastEngagedAt: at(0.5),
      createdAt: at(2),
      updatedAt: at(0.5),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      title: 'Seeded big time with deadline',
      status: 'pending',
      size: 'big_time',
      deadline: inDays(3), // inside the bonus window
      lastEngagedAt: at(1),
      createdAt: at(5),
      updatedAt: at(1),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      title: 'Seeded needs review',
      status: 'pending',
      size: 'quick_win',
      hasCheckNeeded: true,
      // Both columns are JSON-encoded strings on the wire (TaskData).
      // parseReviewFlags drops unknown keys — 'inferred' array is the shape.
      reviewFlags: JSON.stringify({ inferred: ['size'], missingDeadline: true }),
      contexts: JSON.stringify(['phone']),
      lastEngagedAt: at(0.2),
      createdAt: at(0.2),
      updatedAt: at(0.2),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      title: 'Seeded overdue',
      status: 'in_progress',
      size: 'quick_win',
      deadline: at(2), // two days past
      notes: 'Some in-flight notes to render.',
      lastEngagedAt: at(3),
      createdAt: at(10),
      updatedAt: at(3),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      title: 'Seeded done yesterday',
      status: 'completed',
      size: 'quick_win',
      lastEngagedAt: at(1),
      createdAt: at(4),
      updatedAt: at(1),
    },
  ];
}

/** Create-or-fetch the seed user; returns its id. */
async function ensureSeedUser(): Promise<string> {
  const headers = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD, email_confirm: true }),
  });
  if (created.ok) {
    const body = (await created.json()) as { id: string };
    return body.id;
  }
  // Already exists (422) → look it up. Anything else is a real failure.
  if (created.status !== 422) {
    throw new Error(`admin create user failed: ${created.status} ${await created.text()}`);
  }
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, { headers });
  if (!list.ok) throw new Error(`admin list users failed: ${list.status}`);
  const body = (await list.json()) as { users: { id: string; email?: string }[] };
  const user = body.users.find((candidate) => candidate.email === SEED_EMAIL);
  if (!user) throw new Error(`user ${SEED_EMAIL} exists but was not found in the first 200`);
  return user.id;
}

async function main() {
  const empty = process.argv.includes('--empty');
  const userId = await ensureSeedUser();
  const db = createDbClient(DATABASE_URL);

  await db.delete(tasks).where(eq(tasks.userId, userId));
  const fixtures = empty ? [] : defaultFixtures(new Date());
  if (fixtures.length > 0) {
    await db
      .insert(tasks)
      .values(fixtures.map((task) => ({ ...task, userId, syncedAt: sql`now()` })));
  }

  // oxlint-disable-next-line no-console -- CLI output is the whole point
  console.log(`Seeded ${fixtures.length} tasks for ${SEED_EMAIL} (${userId}).`);
  // oxlint-disable-next-line no-console -- CLI output is the whole point
  console.log(`Sign in with: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  await db.$client.end();
}

await main();
