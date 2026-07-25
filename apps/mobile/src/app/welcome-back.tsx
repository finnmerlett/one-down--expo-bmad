import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { WelcomeBackSummary } from '@/components/welcome-back/welcome-back-summary';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { buildWelcomeBackSummary } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * Welcome-back screen (Story 7.3, AC1/AC2): a factual, guilt-free summary
 * shown once per return before the card stack. Reached by the absence check
 * (hooks/use-absence-check.ts) or the onedown://welcome-back deep link.
 */
export default function WelcomeBackScreen() {
  const router = useRouter();
  const tasks = useTasks();
  const lastActiveAt = useAppStore((state) => state.lastActiveAt);
  const setWelcomeBackPending = useAppStore((state) => state.setWelcomeBackPending);

  // Deep-link/dev entry must ALSO arm the quick-win promotion (the absence
  // hook already set it on the organic path — setting twice is harmless).
  useEffect(() => {
    setWelcomeBackPending(true);
  }, [setWelcomeBackPending]);

  // Degenerate daysAway of 0 (deep link with a fresh lastActiveAt) renders
  // gracefully — the copy simply omits the days line.
  const summary = useMemo(
    () => buildWelcomeBackSummary(tasks, lastActiveAt ?? Date.now(), new Date()),
    [tasks, lastActiveAt],
  );

  // welcome_back_shown once per mount (screen views are PostHog built-ins;
  // this event carries the domain counts).
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    track('welcome_back_shown', {
      days_away: summary.daysAway,
      tasks_waiting: summary.tasksWaiting,
      deadlines_passed: summary.deadlinesPassed,
      stale_suggestions: summary.staleSuggestions,
    });
  }, [summary]);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <WelcomeBackSummary
        summary={summary}
        onTriage={() => {
          track('welcome_back_cta_tapped', { cta: 'triage' });
          // Replace, not push — backing out of triage should land on the
          // deck, not re-show this summary.
          router.replace('/triage');
        }}
        onDeck={() => {
          track('welcome_back_cta_tapped', { cta: 'main_deck' });
          leave();
        }}
      />
    </SafeAreaView>
  );
}
