import { useSegments } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';

/**
 * Route TEMPLATE segments → a low-cardinality screen name (Story 8.3 AC2):
 * `[] → 'home'`, `['task', '[id]'] → 'task/[id]'` — never a concrete UUID,
 * so PostHog screen views stay aggregatable (and NFR-S3-safe by shape).
 */
export function screenNameFromSegments(segments: readonly string[]): string {
  return segments.length === 0 ? 'home' : segments.join('/');
}

/**
 * Manual screen tracking for Expo Router (React Navigation v7 cannot be
 * autocaptured — `captureScreens` stays false). A plain effect keyed on the
 * joined-segments string: no state, no extra renders on route transitions
 * (NFR-P4). Mounted only inside AppPostHogProvider's keyed tree; the client
 * null-check keeps any stray render (Storybook/portable stories) a no-op.
 */
export function useScreenTracking(): void {
  const posthog = usePostHog();
  const segments = useSegments();
  const screenName = screenNameFromSegments(segments);

  useEffect(() => {
    // SDK types the client as always-present; it's absent at runtime when no
    // provider is mounted.
    posthog?.screen(screenName);
  }, [posthog, screenName]);
}
