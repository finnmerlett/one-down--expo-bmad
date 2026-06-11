import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsProperties } from './events';

// The typed seam over posthog.capture() — and nothing more. No transport,
// no queueing, no identity, no global PII filtering (PostHog built-ins own
// those; see docs/posthog-integration.md).
export type AnalyticsClient = {
  capture: (event: string, properties?: AnalyticsProperties) => unknown;
};

let client: AnalyticsClient | null = null;

// Wired by the PostHog provider when a key is configured; null = no-op mode.
export function setAnalyticsClient(next: AnalyticsClient | null): void {
  client = next;
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (client) {
    client.capture(event, properties);
    return;
  }
  if (__DEV__) {
    // No PostHog key configured (AC: console fallback in dev, no-op in prod).
    // oxlint-disable-next-line no-console
    console.debug(`[analytics noop] ${event}`, properties);
  }
}
