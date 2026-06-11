// NFR-S3 enforcement: task content must never reach PostHog. This sanitizer
// is wired into the SDK's before_send hook so it covers EVERY event uniformly
// (autocapture, lifecycle, screens, and custom track() events alike).
const PII_PROP_DENYLIST = new Set([
  'title',
  'task_title',
  'details',
  'task_details',
  'note',
  'notes',
  'description',
  'content',
  'text',
  'raw_text',
  'body',
  'subtask_title',
  // $autocapture touch events carry element text + a11y labels in $elements[]
  // — task titles rendered on cards would leak through these (review finding).
  '$el_text',
  'attr__accessibilitylabel',
]);

const REDACTED = '[redacted:nfr-s3]';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Recursively redacts denylisted keys (case-insensitive) anywhere in the
// property tree. Values are replaced, not dropped, so redaction is visible
// in PostHog rather than silently shaping the schema.
export function sanitizeEventProperties<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeEventProperties(item)) as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = PII_PROP_DENYLIST.has(key.toLowerCase())
      ? REDACTED
      : sanitizeEventProperties(entry);
  }
  return result as T;
}
