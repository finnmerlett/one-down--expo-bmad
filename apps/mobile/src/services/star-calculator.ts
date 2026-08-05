import { BONUS_WINDOW, sizeKeyOf, STAR_WEIGHTS, type TaskData } from '@one-down/shared';

/**
 * Star reward calculator, v1.5 economy (spec §3 / design Row E) — pure, no
 * React. Size alone sets a card's value; badges (deadline bonus window,
 * don't-skip offer) ride on top of it and never stack — the larger wins.
 * All tuning lives in the shared STAR_WEIGHTS / BONUS_WINDOW constants.
 */

const DAY_MS = 86_400_000;

/** The card's whole value (white pill, working-screen bucket): ★5 quick win,
 *  ★20 big time; unsized rides at quick-win value until sized. */
export function taskValue(task: Pick<TaskData, 'size'>): number {
  return STAR_WEIGHTS.taskValue[sizeKeyOf(task.size)];
}

/** A live badge on a card — the band leads with `+amount` and its reason. */
export interface StarBadge {
  kind: 'window' | 'offer';
  amount: number;
  /** Caps copy after the amount chip: `BONUS UNTIL WED` / `TO START IT NOW`. */
  reason: string;
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

/**
 * Deadline bonus window (Row E "why the window opens early"): aiming to land
 * work three days early, the window opens 4 days out and runs 2 — gone from
 * 2 days out (placement takes over). Short notice (created <4 days before
 * the deadline) opens immediately and still gets the full length, capped at
 * the deadline. Derived entirely from deadline+createdAt — a fresh deadline
 * gets a fresh window (ambiguity #8).
 */
export function bonusWindow(
  task: Pick<TaskData, 'size' | 'deadline' | 'createdAt'>,
  now: Date,
): StarBadge | null {
  if (!task.deadline) return null;
  const deadline = task.deadline.getTime();
  const normalOpen = deadline - BONUS_WINDOW.opensDaysBeforeDeadline * DAY_MS;
  // Short notice: the window starts at creation. Normal: 4 days out.
  const start = Math.max(normalOpen, task.createdAt.getTime());
  const close = Math.min(start + BONUS_WINDOW.lengthDays * DAY_MS, deadline);
  const t = now.getTime();
  if (t < start || t >= close) return null;
  return {
    kind: 'window',
    amount: STAR_WEIGHTS.bonusBadge[sizeKeyOf(task.size)],
    reason: `BONUS UNTIL ${WEEKDAY.format(new Date(close)).toUpperCase()}`,
  };
}

/** From 2 days out the badge is gone and the card is dealt first instead
 *  (clay TOP OF THE DECK band; still subject to filters — dots mark it when
 *  a filter hides it). Overdue cards keep the placement. */
export function isTopOfDeck(task: Pick<TaskData, 'deadline'>, now: Date): boolean {
  if (!task.deadline) return false;
  return task.deadline.getTime() - now.getTime() <= BONUS_WINDOW.topOfDeckDays * DAY_MS;
}

/**
 * The single live badge for a card: deadline window vs don't-skip offer —
 * two reasons never stack, the larger badge wins (spec §2). `offerAmount`
 * comes from the local task_offers table (0/undefined = none).
 */
export function liveBadge(
  task: Pick<TaskData, 'size' | 'deadline' | 'createdAt'>,
  offerAmount: number | undefined,
  now: Date,
): StarBadge | null {
  const window = bonusWindow(task, now);
  const offer: StarBadge | null =
    offerAmount && offerAmount > 0
      ? { kind: 'offer', amount: offerAmount, reason: 'TO START IT NOW' }
      : null;
  if (window && offer) return window.amount >= offer.amount ? window : offer;
  return window ?? offer;
}

/**
 * Star value shown on the card front / working-screen bucket (FR11): the
 * card's timeless value. Badges are displayed separately (band + chip) and
 * never fold into this number. Signature keeps the old (task, activeTasks,
 * now) shape so call sites stay stable; the extra args are unused in the
 * v1.5 model.
 */
export function potentialStars(
  task: Pick<TaskData, 'size'>,
  _activeTasks?: readonly TaskData[],
  _now?: Date,
): number {
  return taskValue(task);
}

/** Itemized completion award — persisted total, toast copy source. */
export interface StarBreakdown {
  /** The card's size value. */
  value: number;
  /** Live badge amount at the moment of completion (window/offer). */
  bonus: number;
  /** Hollow stars already banked on this task's steps (paid out earlier). */
  banked: number;
  /** value + bonus − banked, floored at 0 (over-banked is never punished). */
  total: number;
}

/**
 * The completion conversion (Row E "banking"): completing converts the lot —
 * the task pays its whole value plus any live badge, MINUS what the steps
 * already banked, so a task's total always equals value + badge. Floors at
 * 0: banking past the value (possible on legacy data) is never clawed back.
 */
export function calculateCompletionStars(
  task: Pick<TaskData, 'size' | 'deadline' | 'createdAt'>,
  options: { bankedStars: number; offerAmount?: number; now?: Date },
): StarBreakdown {
  const now = options.now ?? new Date();
  const value = taskValue(task);
  const badge = liveBadge(task, options.offerAmount, now);
  const bonus = badge?.amount ?? 0;
  const banked = Math.max(0, options.bankedStars);
  return {
    value,
    bonus,
    banked,
    total: Math.max(0, value + bonus - banked),
  };
}

/** Hollow stars a single completed step banks on this task (1 quick win /
 *  2 big time), given how many completed steps precede it in the count —
 *  steps beyond the banking cap bank nothing. */
export function stepBankAmount(task: Pick<TaskData, 'size'>, completedCountAfter: number): number {
  const key = sizeKeyOf(task.size);
  if (completedCountAfter > STAR_WEIGHTS.stepBankCap[key]) return 0;
  return STAR_WEIGHTS.stepBank[key];
}

/** Total banked for `completedCount` completed steps (cap applied) — the
 *  order-free accounting both the award delta and the banked counter use. */
export function bankedForCount(task: Pick<TaskData, 'size'>, completedCount: number): number {
  const key = sizeKeyOf(task.size);
  return Math.min(completedCount, STAR_WEIGHTS.stepBankCap[key]) * STAR_WEIGHTS.stepBank[key];
}
