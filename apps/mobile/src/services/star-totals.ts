import type { StarActivityData } from '@one-down/shared';

/**
 * Star totals math (Story 4.2) — pure, no React. The daily boundary is
 * device-local midnight; 4.3's "Today" filter reuses the same rule.
 */

/** Device-timezone midnight for the day containing `now`. */
export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Signed sums over the transaction ledger: `total` across everything,
 * `today` over rows stamped at or after local midnight (FR48 — both are
 * displayed together). Empty ledger → zeros, never an error.
 */
export function computeStarTotals(
  rows: Pick<StarActivityData, 'amount' | 'createdAt'>[],
  now: Date,
): { total: number; today: number } {
  const dayStart = startOfLocalDay(now).getTime();
  let total = 0;
  let today = 0;
  for (const row of rows) {
    total += row.amount;
    if (row.createdAt.getTime() >= dayStart) today += row.amount;
  }
  return { total, today };
}
