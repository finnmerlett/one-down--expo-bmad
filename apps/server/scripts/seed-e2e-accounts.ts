/**
 * E2E fixture accounts (2026-08-12, 9-5 item 1): one supabase-local account
 * PER CONVERTED MAESTRO FLOW, each holding exactly the task state that flow
 * tests. Flows sign in (common/sign-in-seeded.yaml) and pull their fixtures
 * instead of hand-tapping tasks through the UI — faster, less flaky, and it
 * reaches states the UI can't set up (skip counts, completed sets, review
 * flags, staggered timestamps).
 *
 *   bun run seed:e2e                 # wipe + reseed every account
 *   bun run seed:e2e -- --only list  # just one slug (debugging)
 *
 * Per-flow accounts because Maestro runs flows sequentially against mutable
 * server state — a shared account would leak one flow's pushed mutations
 * into the next. Every run wipes and reinserts, so drift can't accumulate.
 *
 * Fixture rules (violations break label-string asserts in the flows):
 * - NO deadlines except in the `bonus` account: a live bonus badge extends
 *   the card's a11y label ("Plus N bonus right now") and full-string
 *   selectors would miss. Flow 28 owns deadline/badge coverage.
 * - Stars and subtasks are LOCAL-only — fixtures cannot pre-earn stars or
 *   pre-create steps. Flows that assert star maths still earn them in-app.
 * - reviewFlags shape is {"inferred":[...],"missingDeadline":true} —
 *   parseReviewFlags drops unknown keys silently.
 *
 * LOCAL ONLY: supabase-demo service-role key = public constant of the local
 * stack (same standing as the demo anon key baked into the app).
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

export const E2E_PASSWORD = 'seed-password-123';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 18:00 local, `days` days from now — the app's deadline normalization. */
function sixPmIn(now: Date, days: number): Date {
  const deadline = new Date(now.getTime() + days * DAY_MS);
  deadline.setHours(18, 0, 0, 0);
  return deadline;
}

const BASE = {
  details: null,
  notes: null,
  criticality: null,
  contexts: null,
  deadline: null,
  hasCheckNeeded: false,
  reviewFlags: null,
  skipCount: 0,
  skipWindowStartedAt: null,
} as const;

type FixtureSpec = Partial<TaskData> & Pick<TaskData, 'title' | 'status' | 'size'>;

/** Fill a sparse spec into a full TaskData row. Timestamps default to one
 *  hour ago so nothing reads as stale (STALE_AFTER_DAYS = 7). */
function task(now: Date, spec: FixtureSpec): TaskData {
  const anHourAgo = new Date(now.getTime() - HOUR_MS);
  return {
    ...BASE,
    id: crypto.randomUUID(),
    lastEngagedAt: anHourAgo,
    createdAt: anHourAgo,
    updatedAt: anHourAgo,
    ...spec,
  };
}

/**
 * slug → fixtures. Account email is `e2e-<slug>@test.local`. Keep each set
 * in lockstep with its flow file (noted per entry).
 */
const ACCOUNTS: Record<string, (now: Date) => TaskData[]> = {
  // 04-story-1-3-card-stack: beta pinned top by quick-win momentum; gamma
  // is added mid-flow through the UI (mid-browse add is the AC under test).
  stack: (now) => [
    task(now, { title: 'Stack task beta', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Stack task alpha', status: 'pending', size: null }),
  ],
  // 06-story-1-5-task-list
  list: (now) => [
    task(now, { title: 'First listed task', status: 'pending', size: null }),
    task(now, { title: 'Second listed task', status: 'pending', size: null }),
  ],
  // 09-story-2-3-complete-task
  complete: (now) => [
    task(now, { title: 'Finish me first', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Next in line', status: 'pending', size: null }),
  ],
  // 10-story-6-4-refine-and-nudge: council is pre-skipped to the nudge
  // threshold (5) so ONE swipe surfaces the E9 nudge instead of ten.
  refine: (now) => [
    task(now, { title: 'Sort the paperwork mountain', status: 'pending', size: 'quick_win' }),
    task(now, {
      title: 'Ring the council office',
      status: 'pending',
      size: null,
      skipCount: 5,
      skipWindowStartedAt: new Date(now.getTime() - HOUR_MS),
    }),
  ],
  // 11-story-3-1-context-toggle-bar
  contexts: (now) => [
    task(now, {
      title: 'Water plants',
      status: 'pending',
      size: 'quick_win',
      contexts: JSON.stringify(['home']),
    }),
    task(now, {
      title: 'Email plumber',
      status: 'pending',
      size: null,
      contexts: JSON.stringify(['phone']),
    }),
  ],
  // 12-story-3-2-mode-toggle (Home tag on Tiny chore is applied in-flow)
  modes: (now) => [
    task(now, { title: 'Tiny chore', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Giant project', status: 'pending', size: 'big_time' }),
  ],
  // 13-story-3-3-curation
  curation: (now) => [
    task(now, { title: 'Tiny task', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Huge task', status: 'pending', size: 'big_time' }),
  ],
  // 15-story-4-1-star-earning (stars are earned in-app; fixtures only park
  // the two subjects — quick win pins leg 1's subject on top)
  stars: (now) => [
    task(now, { title: 'Earn stars task', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Let go task', status: 'pending', size: null }),
  ],
  // 18-story-4-4-done-section: three pre-completed rows with staggered
  // updatedAt (done section sorts updatedAt ASC — Gamma newest peeks just
  // above "To do"), one pending row.
  done: (now) => [
    task(now, {
      title: 'Alpha task',
      status: 'completed',
      size: null,
      updatedAt: new Date(now.getTime() - 3 * HOUR_MS),
    }),
    task(now, {
      title: 'Beta task',
      status: 'completed',
      size: null,
      updatedAt: new Date(now.getTime() - 2 * HOUR_MS),
    }),
    task(now, {
      title: 'Gamma task',
      status: 'completed',
      size: null,
      updatedAt: new Date(now.getTime() - 1 * HOUR_MS),
    }),
    task(now, { title: 'Delta task', status: 'pending', size: null }),
  ],
  // 23-story-6-2-review-mode: reproduces the brain-dump inference result as
  // fixture flags (size + contexts guessed, missing deadline) — the queue
  // flow no longer depends on the AI leg (08-6-1 covers brain dump itself).
  triage: (now) => [
    task(now, {
      title: 'Call the dentist soon',
      status: 'pending',
      size: 'quick_win',
      contexts: JSON.stringify(['phone']),
      hasCheckNeeded: true,
      reviewFlags: JSON.stringify({ inferred: ['size', 'contexts'], missingDeadline: true }),
    }),
    task(now, {
      title: 'Ponder the universe quietly for a while',
      status: 'pending',
      size: null,
    }),
  ],
  // 24-story-7-1-bulk-archive-delete: A completed IN-FLOW (the archive
  // warning keys off real star transactions, which never sync).
  archive: (now) => [
    task(now, { title: 'Archive me A', status: 'pending', size: 'quick_win' }),
    task(now, { title: 'Archive me B', status: 'pending', size: null }),
  ],
  // 25-story-7-2-avoided-task-prompt: subject seeded one skip below the
  // threshold (5) so two swipes flag it instead of ten.
  avoided: (now) => [
    task(now, {
      title: 'Skip target',
      status: 'pending',
      size: 'quick_win',
      skipCount: 4,
      skipWindowStartedAt: new Date(now.getTime() - HOUR_MS),
    }),
    task(now, { title: 'Other card', status: 'pending', size: null }),
  ],
  // 26-story-7-3-welcome-back: quick win older, big time newer — the
  // welcome-back promotion must still put the quick win on top.
  welcome: (now) => [
    task(now, {
      title: 'Quick one',
      status: 'pending',
      size: 'quick_win',
      createdAt: new Date(now.getTime() - 2 * DAY_MS),
      lastEngagedAt: new Date(now.getTime() - 2 * DAY_MS),
      updatedAt: new Date(now.getTime() - 2 * DAY_MS),
    }),
    task(now, { title: 'Big one', status: 'pending', size: 'big_time' }),
  ],
  // 28-95-bonus-window (9-5 items 12/13/15/16): due-today → placement, no
  // badge under 2 days; three window-eligible cards (3 days out) with
  // distinct criticalities → urgency hands the two badge slots to critical
  // + important, chill goes without (MAX_LIVE_BONUSES = 2).
  bonus: (now) => [
    task(now, {
      title: 'Due today task',
      status: 'pending',
      size: null,
      deadline: sixPmIn(now, 0),
    }),
    task(now, {
      title: 'Critical mission',
      status: 'pending',
      size: 'quick_win',
      criticality: 'critical',
      deadline: sixPmIn(now, 3),
    }),
    task(now, {
      title: 'Important errand',
      status: 'pending',
      size: null,
      criticality: 'important',
      deadline: sixPmIn(now, 3),
    }),
    task(now, {
      title: 'Chill chore',
      status: 'pending',
      size: null,
      criticality: null,
      deadline: sixPmIn(now, 3),
    }),
  ],
};

export const e2eEmail = (slug: string) => `e2e-${slug}@test.local`;

/** Create-or-fetch one auth user; returns its id. */
async function ensureUser(email: string): Promise<string> {
  const headers = {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
  const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password: E2E_PASSWORD, email_confirm: true }),
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
  const user = body.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`user ${email} exists but was not found in the first 200`);
  return user.id;
}

async function main() {
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];
  const slugs = only ? [only] : Object.keys(ACCOUNTS);
  const unknown = slugs.filter((slug) => !(slug in ACCOUNTS));
  if (unknown.length > 0) {
    throw new Error(`unknown account slug(s): ${unknown.join(', ')}`);
  }

  const db = createDbClient(DATABASE_URL);
  const now = new Date();
  for (const slug of slugs) {
    const userId = await ensureUser(e2eEmail(slug));
    await db.delete(tasks).where(eq(tasks.userId, userId));
    const fixtures = ACCOUNTS[slug]!(now);
    await db
      .insert(tasks)
      .values(fixtures.map((row) => ({ ...row, userId, syncedAt: sql`now()` })));
    // oxlint-disable-next-line no-console -- CLI output is the whole point
    console.log(`${e2eEmail(slug)} ← ${fixtures.length} tasks`);
  }
  await db.$client.end();
}

await main();
