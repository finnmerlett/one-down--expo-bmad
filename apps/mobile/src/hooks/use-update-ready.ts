import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Update-ready detection (2026-07-27): expo-updates only checks at cold
 * launch by default, which forced a "restart twice" dance — launch 1
 * downloads, launch 2 applies. This hook ALSO checks whenever the app returns
 * to the foreground (throttled), so a pending update surfaces mid-session;
 * `isUpdatePending` flips once a downloaded update is ready to boot via
 * Updates.reloadAsync() (a JS reload — no OS-level restart).
 */
const FOREGROUND_CHECK_MIN_MS = 60_000;

export function useUpdateReady(): boolean {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheckRef = useRef(0);

  useEffect(() => {
    // Dev builds have the update engine disabled — nothing to poll.
    if (__DEV__ || !Updates.isEnabled) return;
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

  return isUpdatePending;
}
