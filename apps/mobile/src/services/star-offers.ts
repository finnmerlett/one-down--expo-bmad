import { and, eq, gt, inArray, sql } from 'drizzle-orm';

import { SKIP_OFFER, sizeKeyOf, STAR_WEIGHTS, type TaskData } from '@one-down/shared';
import { taskOffers, tasks } from '@one-down/shared/schema-local';

import { track } from '@/lib/analytics/track';
import type { TasksDb } from '@/services/tasks-repository';

/**
 * Don't-skip offers (v1.5 Row E "skipping, and what it costs"): when a card
 * keeps being passed — or has sat unengaged a long time — the deck bids for
 * it: +3 on a quick win, +10 on a big time, eroding front-loaded per pass
 * (3·1·0 / 10·6·2·0). Random in WHETHER it fires (coin flip when the card
 * next comes round), fixed in how much. One live offer at a time, globally.
 * Spent offers can return after a cooldown. All state lives in the local
 * task_offers table — a per-device mechanic, never synced.
 */

const DAY_MS = 86_400_000;

/** Live offers as taskId → amount (amount > 0 only). */
export async function liveOffers(db: TasksDb): Promise<Map<string, number>> {
  const rows = await db.select().from(taskOffers).where(gt(taskOffers.amount, 0));
  return new Map(rows.map((row) => [row.taskId, row.amount]));
}

/**
 * Consider starting an offer for the task that just reached the top of the
 * deck. Self-gates on: task browsable, a trigger armed (skipCount ≥ 3, or
 * unengaged ≥ 7 days), no live offer anywhere, and this task not inside its
 * re-offer cooldown. Then flips the coin. Returns the started amount or 0.
 */
export async function maybeStartOffer(
  db: TasksDb,
  task: TaskData,
  now = new Date(),
  random: () => number = Math.random,
): Promise<number> {
  if (task.status !== 'pending' && task.status !== 'in_progress') return 0;
  const avoided = task.skipCount >= SKIP_OFFER.skipTrigger;
  const aged = now.getTime() - task.lastEngagedAt.getTime() >= SKIP_OFFER.ageTriggerDays * DAY_MS;
  if (!avoided && !aged) return 0;

  try {
    // One live offer at a time — anywhere. (Rows for completed/archived
    // tasks are cleared at award time, so live rows belong to active cards.)
    const [live] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskOffers)
      .where(gt(taskOffers.amount, 0));
    if ((live?.count ?? 0) > 0) return 0;

    const [own] = await db.select().from(taskOffers).where(eq(taskOffers.taskId, task.id));
    if (own) {
      if (own.amount > 0) return 0;
      const spentAt = own.spentAt?.getTime() ?? 0;
      if (now.getTime() - spentAt < SKIP_OFFER.cooldownDays * DAY_MS) return 0;
    }

    if (random() >= SKIP_OFFER.startChance) return 0;

    const amount = STAR_WEIGHTS.bonusBadge[sizeKeyOf(task.size)];
    if (own) {
      await db
        .update(taskOffers)
        .set({ amount, spentAt: null })
        .where(eq(taskOffers.taskId, task.id));
    } else {
      await db.insert(taskOffers).values({ taskId: task.id, amount });
    }
    track('offer_started', { amount, trigger: avoided ? 'avoidance' : 'age' });
    return amount;
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Offer start failed', error);
    return 0;
  }
}

/**
 * What one more committed pass would COST a live offer (E5x mid-drag float:
 * the clay −N rising off the badge). Pure — mirrors erodeOffer's rung rule.
 */
export function erosionLoss(task: Pick<TaskData, 'size'>, amount: number): number {
  const ladder = STAR_WEIGHTS.offerLadder[sizeKeyOf(task.size)];
  const to = ladder.find((step) => step < amount) ?? 0;
  return Math.max(0, amount - to);
}

/**
 * Erode a task's live offer by one ladder step after a committed pass.
 * Front-loaded: the first skip costs the most. At 0 the offer is spent and
 * the cooldown starts. Returns {from, to} when something eroded, null when
 * the task had no live offer.
 */
export async function erodeOffer(
  db: TasksDb,
  taskId: string,
  task: Pick<TaskData, 'size'>,
  now = new Date(),
): Promise<{ from: number; to: number } | null> {
  try {
    const [own] = await db.select().from(taskOffers).where(eq(taskOffers.taskId, taskId));
    if (!own || own.amount <= 0) return null;
    const ladder = STAR_WEIGHTS.offerLadder[sizeKeyOf(task.size)];
    // Next rung strictly below the current amount — robust to a size change
    // mid-offer (amount not on this ladder still steps downward).
    const to = ladder.find((step) => step < own.amount) ?? 0;
    await db
      .update(taskOffers)
      .set({ amount: to, spentAt: to === 0 ? now : null })
      .where(eq(taskOffers.taskId, taskId));
    track('offer_eroded', { from: own.amount, to });
    return { from: own.amount, to };
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Offer erode failed', error);
    return null;
  }
}

/** Drop offer rows for tasks that are no longer active (housekeeping used by
 *  tests and future cleanup passes; award paths clear their own rows). */
export async function clearInactiveOffers(db: TasksDb): Promise<void> {
  const rows = await db.select({ taskId: taskOffers.taskId }).from(taskOffers);
  if (rows.length === 0) return;
  const ids = rows.map((row) => row.taskId);
  const active = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(inArray(tasks.id, ids), inArray(tasks.status, ['pending', 'in_progress'])));
  const keep = new Set(active.map((row) => row.id));
  const drop = ids.filter((id) => !keep.has(id));
  if (drop.length > 0) {
    await db.delete(taskOffers).where(inArray(taskOffers.taskId, drop));
  }
}
