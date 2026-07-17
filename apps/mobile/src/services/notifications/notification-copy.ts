// The FIXED notification copy catalogue (AC3). Every notification string in
// the app comes from here — nothing composes copy dynamically, so no code
// path can drift into guilt framing ("overdue", task counts, "you haven't
// opened the app"). Tone: factual, inviting, zero guilt (PRD anti-nagging).
//
// Task titles ARE allowed in notification bodies: they render on the user's
// own device and are never transmitted — NFR-S3 covers analytics/logs only.

/** Deadline notice scheduled at deadline − 24h. */
export function deadlineTomorrowCopy(taskTitle: string): { title: string; body: string } {
  return {
    title: `"${taskTitle}" is due tomorrow`,
    body: 'Open it when you’re ready — one step at a time.',
  };
}

/** Fallback notice when the 24h mark already passed but the deadline is still ahead. */
export function deadlineSoonCopy(taskTitle: string): { title: string; body: string } {
  return {
    title: `"${taskTitle}" is coming up`,
    body: 'Open it when you’re ready — one step at a time.',
  };
}

/** Challenge invitation (cadence-scheduled, AC2). */
export const CHALLENGE_COPY = {
  title: 'Got a quick 5 minutes?',
  body: 'There’s a task in your deck when you’re ready.',
} as const;
