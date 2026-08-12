import type { TaskSize } from '../types/task';

/**
 * Centralized star-reward weights (UX-DR 9; architecture: importable by both
 * mobile and server). No magic numbers at call sites — every award amount
 * derives from these.
 *
 * v1.5 economy (designs/v1.5-implementation-spec.md §3, Row E of the design):
 * size alone sets a card's value ("Quick win — ★5. Big time — ★20. Two sizes
 * only."); steps bank hollow stars out of that value; badges (deadline
 * window, don't-skip offer) ride on top and never stack — the larger wins.
 * Tasks pay in fives; tidying pays only when the triage queue empties.
 */
export type SizeKey = TaskSize | 'unsized';

/** Resolve a task's (possibly null) size to a weights key. */
export function sizeKeyOf(size: TaskSize | null | undefined): SizeKey {
  return size ?? 'unsized';
}

export const STAR_WEIGHTS = {
  /** v1.5: the card's whole value — unsized rides at quick-win value until sized. */
  taskValue: { quick_win: 5, big_time: 20, unsized: 5 } satisfies Record<SizeKey, number>,
  /** Hollow stars banked per completed step. */
  stepBank: { quick_win: 1, big_time: 2, unsized: 1 } satisfies Record<SizeKey, number>,
  /** Steps that bank, per size — the indicator fills exactly at the card's value. */
  stepBankCap: { quick_win: 5, big_time: 10, unsized: 5 } satisfies Record<SizeKey, number>,
  /** Badge amount for BOTH the deadline bonus window and the don't-skip offer. */
  bonusBadge: { quick_win: 3, big_time: 10, unsized: 3 } satisfies Record<SizeKey, number>,
  /** Don't-skip offer erosion ladder — one step per committed pass, front-loaded. */
  offerLadder: {
    quick_win: [3, 1, 0],
    big_time: [10, 6, 2, 0],
    unsized: [3, 1, 0],
  } satisfies Record<SizeKey, readonly number[]>,
  /** FR66 — deliberately small (release is rewarded, not equal to doing). */
  cutLoose: 3,
  /** v1.5: emptying the triage queue pays once, at most once per local day. */
  triageQueueCleared: 5,
} as const;

/** Deadline bonus window (Row E, revised 9-5 item 12): the badge is live
 *  while the deadline is 2–4 CALENDAR days away (deadline today = 0 days) —
 *  under 2 days there is no bonus, the card is dealt first instead
 *  (placement takes over exactly where the badge stops). Short notice earns
 *  nothing: a task created inside the window simply has whatever window
 *  days remain. */
export const BONUS_WINDOW = {
  /** First calendar day (counting back from the deadline) with the badge. */
  opensDaysBeforeDeadline: 4,
  /** Last calendar day with the badge; below this, placement takes over. */
  closesDaysBeforeDeadline: 2,
} as const;

/** Don't-skip offer mechanics (Row E "skipping, and what it costs"). */
export const SKIP_OFFER = {
  /** Passes of the top card before the offer can fire (avoidance trigger). */
  skipTrigger: 3,
  /** Days a task must sit unengaged for the age trigger. */
  ageTriggerDays: 7,
  /** The coin flip: chance the offer appears when the card next comes round. */
  startChance: 0.5,
  /** Days after eroding to nothing before the card can be offered again. */
  cooldownDays: 3,
} as const;
