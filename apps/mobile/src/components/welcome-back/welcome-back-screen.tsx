import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { WelcomeBackSummary } from '@/components/welcome-back/welcome-back-summary';
import type { WelcomeBackSummary as SummaryData } from '@/services/welcome-back';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole welcome-back screen as the user sees it — the factual summary
 * and its triage / deck CTAs — driven entirely by props.
 * src/app/welcome-back.tsx supplies the summary, analytics and navigation;
 * the screen stories (and so the design canvas) supply fixtures.
 */
export function WelcomeBackScreen({
  summary,
  onTriage,
  onDeck,
}: {
  summary: SummaryData;
  onTriage: () => void;
  onDeck: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <WelcomeBackSummary summary={summary} onTriage={onTriage} onDeck={onDeck} />
    </SafeAreaView>
  );
}
