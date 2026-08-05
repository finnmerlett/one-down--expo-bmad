import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { Updates } from '@/lib/expo-updates-safe';

/**
 * Update-ready detection (2026-07-27): expo-updates only checks at cold
 * launch by default, which forced a "restart twice" dance — launch 1
 * downloads, launch 2 applies. This hook ALSO checks whenever the app returns
 * to the foreground (throttled), so a pending update surfaces mid-session;
 * `isUpdatePending` flips once a downloaded update is ready to boot via
 * Updates.reloadAsync() (a JS reload — no OS-level restart).
 *
 * Binaries without the ExpoUpdates native module get the inert stub from
 * expo-updates-safe — `isUpdatePending` is then always false.
 */
const FOREGROUND_CHECK_MIN_MS = 60_000;

// Local e2e/emulator builds bake EXPO_PUBLIC_OTA_UI=off (apps/mobile/.env)
// so the banner can't pop mid-flow and shift the layout under Maestro. The
// native cold-launch check may still download in the background; this only
// keeps the UI quiet. Never set in the EAS env — the phone needs the banner.
const OTA_UI_DISABLED = process.env.EXPO_PUBLIC_OTA_UI === 'off';

export function useUpdateReady(): boolean {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // Dev builds have the update engine disabled — nothing to poll.
    if (OTA_UI_DISABLED || __DEV__ || !Updates.isEnabled) return;
    const check = async () => {
      if (Date.now() - lastCheckRef.current < FOREGROUND_CHECK_MIN_MS) return;
      lastCheckRef.current = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Network hiccups are routine (VPN off, cold radio) — the next
        // foreground/launch check retries; never surface an error for this.
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, []);

  return OTA_UI_DISABLED ? false : isUpdatePending;
}
