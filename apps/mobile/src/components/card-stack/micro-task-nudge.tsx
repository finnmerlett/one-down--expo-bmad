import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

const REVEAL_MS = 280;
const REVEAL_EASE = Easing.inOut(Easing.quad);

/**
 * Height-reveal wrapper for the nudge (9-5 item 5): the deck above is
 * `flex-1 justify-center`, so mounting the nudge used to steal its ~90px in
 * a single frame and the cards jumped. Animating the wrapper's height
 * instead pushes the deck up with a gentle ease-in-out and reverses it when
 * the next top card carries no nudge. Children stay mounted through the
 * exit so the card fades out as it collapses.
 */
export function NudgeReveal({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const contentHeight = useSharedValue(0);
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    // Reduce Motion: same reveal, no glide.
    const duration = reduceMotion ? 0 : REVEAL_MS;
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration, easing: REVEAL_EASE });
      return;
    }
    progress.value = withTiming(0, { duration, easing: REVEAL_EASE }, (finished) => {
      if (finished) scheduleOnRN(setMounted, false);
    });
  }, [visible, progress, reduceMotion]);

  const frameStyle = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
  }));

  if (!mounted) return null;
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[{ overflow: 'hidden', width: '100%' }, frameStyle]}
    >
      {/* Absolutely pinned so the content keeps its natural height while the
          frame's animated height clips it; bottom-anchored so the card rides
          up with the reveal. */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        onLayout={(event) => {
          contentHeight.value = event.nativeEvent.layout.height;
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

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
      <Text className="font-body text-sm leading-[19px] text-typography-600">
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
        <Text className="font-body-bold text-sm text-primary-600">Show me the smallest step</Text>
        {busy ? null : <Icon as={ArrowRight} size="2xs" className="text-primary-600" />}
      </Pressable>
    </VStack>
  );
}
