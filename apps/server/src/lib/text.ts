/**
 * Truncate `text` to at most `maxChars` UTF-16 code units without splitting a
 * surrogate pair. A bare `String.prototype.slice` can cut an astral character
 * (e.g. an emoji) in half, leaving a lone high surrogate — an ill-formed
 * string that renders as U+FFFD and misbehaves under JSON serialization.
 */
export function truncateChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars);
  const lastCode = sliced.charCodeAt(sliced.length - 1);
  // A trailing HIGH surrogate means the cut split a pair — drop it. (A well-
  // formed input can never end up with a lone LOW surrogate at the cut point.)
  return lastCode >= 0xd800 && lastCode <= 0xdbff ? sliced.slice(0, -1) : sliced;
}

/**
 * Truncate at a word boundary with a visible ellipsis (9-6 task 4): a
 * mid-word chop reads as corrupted text when it lands in user-facing prose
 * (the AI notes distillation ended "…layout options or"). Falls back to a
 * hard cut when the last space sits too early (<60% of the budget) — better
 * a clean mid-word ellipsis than losing half the line. Result is always
 * ≤ maxChars ('…' is one UTF-16 unit, budgeted for by the maxChars-1 cut).
 */
export function truncateCharsAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const hard = truncateChars(text, maxChars - 1).trimEnd();
  const lastSpace = hard.lastIndexOf(' ');
  const cut = lastSpace > maxChars * 0.6 ? hard.slice(0, lastSpace).trimEnd() : hard;
  return `${cut}…`;
}
