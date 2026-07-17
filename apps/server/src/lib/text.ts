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
