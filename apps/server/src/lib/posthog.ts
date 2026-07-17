import { PostHog } from 'posthog-node';

import type { Env } from './env';

/**
 * The server-side analytics seam (Story 8.3) — mirror of the mobile track()
 * philosophy: a real posthog-node client when POSTHOG_API_KEY is set, a no-op
 * stub otherwise, and callers never know the difference.
 */
export interface ServerAnalytics {
  capture(
    distinctId: string,
    event: string,
    properties: Record<string, string | number | boolean | null>,
  ): void;
  /** Flush queued events and stop background timers — call on server close. */
  shutdown(): Promise<void>;
}

const NOOP_ANALYTICS: ServerAnalytics = {
  capture: () => {},
  shutdown: () => Promise.resolve(),
};

export function createServerPostHog(env: Env): ServerAnalytics {
  if (!env.POSTHOG_API_KEY) return NOOP_ANALYTICS;

  const client = new PostHog(env.POSTHOG_API_KEY, {
    host: env.POSTHOG_HOST,
    // Batch to keep capture off the request hot path (logging-best-practices:
    // buffer/batch writes) while still flushing promptly on low traffic.
    flushAt: 20,
    flushInterval: 10_000,
  });

  return {
    capture: (distinctId, event, properties) => {
      client.capture({ distinctId, event, properties });
    },
    shutdown: () => client.shutdown(),
  };
}
