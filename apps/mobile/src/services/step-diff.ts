/**
 * Change report for the step label line (v1.5 05e): `2 ADDED · 1 CHANGED`
 * plus which titles get the NEW tag. Pure text diff between the uncompleted
 * titles before and after an AI action — exact-title matches count as kept,
 * surplus new steps beyond the old count are "added", the rest of the
 * non-matching new steps are "changed".
 */
export interface StepDiff {
  added: number;
  changed: number;
  /** Titles that get the NEW tag (present after, absent before). */
  newTitles: ReadonlySet<string>;
}

export function diffSteps(oldTitles: readonly string[], newTitles: readonly string[]): StepDiff {
  const oldSet = new Set(oldTitles);
  const fresh = newTitles.filter((title) => !oldSet.has(title));
  const added = Math.max(0, newTitles.length - oldTitles.length);
  const changed = Math.max(0, fresh.length - added);
  return { added, changed, newTitles: new Set(fresh) };
}

/** Appends never touch existing rows: everything new is "added". */
export function appendDiff(steps: readonly string[]): StepDiff {
  return { added: steps.length, changed: 0, newTitles: new Set(steps) };
}
