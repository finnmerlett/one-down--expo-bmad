import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { shouldShowWelcomeBack } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';

/**
 * Absence tracking (Story 7.3, AC5) — mounted once on the home screen.
 *
 * On launch (after store rehydration — never decide on the pre-hydration
 * null) and on every background → active return, evaluates the absence
 * threshold: long enough away → arm the quick-win promotion and push the
 * welcome-back screen. Either way the activity clock re-stamps, so
 * re-foregrounding minutes later can never re-trigger (once-per-return
 * guard: the ref re-arms only when the app actually backgrounds).
 */
export function useAbsenceCheck(): void {
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    const evaluate = () => {
      if (checkedRef.current) return;
      checkedRef.current = true;
      const { lastActiveAt, setLastActiveAt, setWelcomeBackPending } = useAppStore.getState();
      const now = new Date();
      if (shouldShowWelcomeBack(lastActiveAt, now)) {
        setWelcomeBackPending(true);
        router.push('/welcome-back');
      }
      setLastActiveAt(now.getTime());
    };

    // Launch check — gated on zustand persist hydration.
    if (useAppStore.persist.hasHydrated()) {
      evaluate();
    }
    const unsubscribeHydration = useAppStore.persist.onFinishHydration(() => evaluate());

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        // Stamp on the way out — the absence measures from here.
        useAppStore.getState().setLastActiveAt(Date.now());
        checkedRef.current = false;
      } else if (state === 'active' && useAppStore.persist.hasHydrated()) {
        // Someone can background the app for 4+ days (AC5).
        evaluate();
      }
    });

    return () => {
      unsubscribeHydration();
      subscription.remove();
    };
  }, [router]);
}
