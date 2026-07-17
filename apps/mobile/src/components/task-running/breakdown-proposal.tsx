import { ActivityIndicator } from 'react-native';

import type { BreakdownMode } from '@one-down/shared';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * AI breakdown proposal area (Story 6.3, AC1/AC2/AC7). Presentational — the
 * route's `useBreakdown` controller drives it. Loading occupies only this
 * area (UX-DR20: the rest of the screen stays interactive); errors are
 * inline with a visible retry, never a modal. Calm copy throughout —
 * rejection is "Not helpful", not an error.
 */
export function BreakdownProposal({
  state,
  steps,
  mode,
  heading = 'Suggested steps',
  loadingLabel = 'Breaking this down...',
  onAccept,
  onShowAll,
  onReject,
  onRetry,
}: {
  state: 'loading' | 'proposal' | 'error';
  steps: string[];
  mode: BreakdownMode;
  /** 6.4 refine relabels the proposal "Refined steps". */
  heading?: string;
  /** 6.4 refine shows "Rethinking the steps..." instead. */
  loadingLabel?: string;
  onAccept: () => void;
  /** Re-request with mode 'full' — hidden once the proposal already is. */
  onShowAll?: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  if (state === 'loading') {
    return (
      <HStack className="items-center gap-3 py-2">
        <ActivityIndicator accessibilityLabel="Loading breakdown" />
        <Text className="text-base text-typography-700">{loadingLabel}</Text>
      </HStack>
    );
  }

  if (state === 'error') {
    return (
      <VStack className="gap-3 py-2">
        <Text accessibilityLiveRegion="polite" className="text-sm text-typography-700">
          Couldn&apos;t reach the server — working offline
        </Text>
        <Button size="md" variant="outline" aria-label="Retry breakdown" onPress={onRetry}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack className="gap-3 rounded-xl border border-outline-200 bg-background-50 p-4">
      <Text className="text-sm font-medium text-typography-500">{heading}</Text>
      <VStack className="gap-2">
        {steps.map((step) => (
          <HStack key={step} className="items-start gap-2">
            <Text className="text-base text-typography-400">•</Text>
            <Text className="flex-1 text-base text-typography-900">{step}</Text>
          </HStack>
        ))}
      </VStack>
      <VStack className="gap-2 pt-1">
        <Button size="md" aria-label="Add these steps" onPress={onAccept}>
          <ButtonText>Add these steps</ButtonText>
        </Button>
        {mode === 'first_steps' && onShowAll ? (
          <Button size="md" variant="outline" aria-label="Show all steps" onPress={onShowAll}>
            <ButtonText>Show all steps</ButtonText>
          </Button>
        ) : null}
        <Button size="md" variant="link" aria-label="Not helpful" onPress={onReject}>
          <ButtonText>Not helpful</ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
}
