import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';

import { posthogBeforeSend } from './analytics/posthog-hooks';
import { setAnalyticsClient } from './analytics/track';

function AnalyticsClientBinder({ children }: { children: ReactNode }) {
  const posthog = usePostHog();

  useEffect(() => {
    setAnalyticsClient(posthog);
    return () => setAnalyticsClient(null);
  }, [posthog]);

  return <>{children}</>;
}

// Scaffold per Story 1.0a: autocapture + lifecycle + before_send PII redaction.
// Live key/config (and the server side) land in Story 8.3. With no key set the
// SDK is never mounted and track() falls back to console (dev) / no-op (prod).
//
// captureScreens is OFF by design: Expo Router (React Navigation v7) cannot be
// autocaptured — screens are tracked manually via posthog.screen() as routes
// are added (docs/posthog-integration.md).
export function AppPostHogProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={apiKey}
      // propsToCapture narrowed from the SDK default (which includes element
      // text via 'children' and accessibilityLabel — both can carry task
      // titles, NFR-S3). before_send redaction is the backstop either way.
      autocapture={{
        captureTouches: true,
        captureScreens: false,
        propsToCapture: ['testID', 'ph-label'],
      }}
      options={{
        // `||` not `??`: an empty-string env var must still fall back to EU,
        // or the SDK silently defaults to its US host (GDPR misroute).
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        captureAppLifecycleEvents: true,
        before_send: posthogBeforeSend,
      }}
    >
      <AnalyticsClientBinder>{children}</AnalyticsClientBinder>
    </PostHogProvider>
  );
}
