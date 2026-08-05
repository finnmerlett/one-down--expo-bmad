import { ActivityIndicator } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * The nudge under the deck (v1.5 frame E9): a card that keeps coming back
 * round gets one quiet offer — the first, smallest step — floating between
 * the deck and the standing actions in clay-on-paper weight so it never
 * competes with Brain dump. Tapping it costs no decisions: home fetches the
 * step, writes it, and opens the working screen with it showing.
 * Presentational; home owns the controller (use-micro-task).
 */
export function MicroTaskNudge({
  state,
  onGo,
  onRetry,
}: {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  /** Fetch the smallest step, add it, and open the working screen. */
  onGo: () => void;
  onRetry: () => void;
}) {
  if (state === 'error') {
    return (
      <HStack className="items-center justify-center gap-3 px-6 pb-3">
        <Text className="text-sm text-typography-600">Couldn&apos;t fetch a step right now</Text>
        <Button size="xs" variant="outline" aria-label="Retry tiny step" onPress={onRetry}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </HStack>
    );
  }

  const busy = state === 'loading' || state === 'proposal';

  return (
    <VStack className="mx-[30px] -mt-4 mb-[14px] gap-[9px] rounded-[18px] border border-outline-100 bg-background-0 px-3.5 py-3 shadow-float">
      <Text className="font-body text-[13px] leading-[19px] text-typography-600">
        This one keeps coming back round.
      </Text>
      <Pressable
        accessibilityRole="button"
        aria-label="Show me the smallest step"
        disabled={busy}
        onPress={onGo}
        className="h-9 flex-row items-center gap-2 self-start rounded-[12px] bg-primary-100 px-3.5 active:bg-primary-50 disabled:opacity-70"
      >
        {busy ? (
          <ActivityIndicator size="small" accessibilityLabel="Finding a tiny first step" />
        ) : null}
        <Text className="font-body-bold text-[13px] text-primary-600">
          Show me the smallest step
        </Text>
        {busy ? null : <Icon as={ArrowRight} size="2xs" className="text-primary-600" />}
      </Pressable>
    </VStack>
  );
}
