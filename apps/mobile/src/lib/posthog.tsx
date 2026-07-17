import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect, type ReactNode } from 'react';

import { useScreenTracking } from '../hooks/use-screen-tracking';
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

/** Renders null; exists only to run the screen-tracking effect (Story 8.3). */
function ScreenTracker() {
  useScreenTracking();
  return null;
}

// Story 1.0a scaffold, completed by Story 8.3: autocapture + lifecycle +
// before_send PII redaction + manual screen tracking. With no key set the
// SDK is never mounted and track() falls back to console (dev) / no-op (prod)
// — a real key is a drop-in with zero code changes.
//
// captureScreens is OFF by design: Expo Router (React Navigation v7) cannot be
// autocaptured — ScreenTracker calls posthog.screen() with route templates
// (docs/posthog-integration.md).
//
// Feature flags need no code here — `useFeatureFlag` from posthog-react-native
// is available to any consumer once the provider is mounted (SDK built-in).
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
      <AnalyticsClientBinder>
        <ScreenTracker />
        {children}
      </AnalyticsClientBinder>
    </PostHogProvider>
  );
}
