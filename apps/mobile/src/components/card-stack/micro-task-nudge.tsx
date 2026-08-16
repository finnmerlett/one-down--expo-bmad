import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TaskHealthPrompt } from '@/components/card-stack/task-health-prompt';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
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
 * The nudge under the deck (v1.5 frame E9 → 9.8 D3): a card that keeps
 * coming back round now surfaces the ORIGINAL task-health prompt (Story 7.2,
 * previously edit-screen-only) instead of the bespoke one-liner. Keep it
 * clears the skip streak, Cut loose releases the task, and Break it down
 * keeps E9's zero-decision magic: fetch the smallest step, write it, open
 * the working screen. Presentational; home owns the controller.
 */
export function MicroTaskNudge({
  state,
  onGo,
  onRetry,
  onKeep,
  onCutLoose,
}: {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  /** Break it down: fetch the smallest step, add it, open the working screen. */
  onGo: () => void;
  onRetry: () => void;
  /** Keep it: clears the skip streak — the panel hides via the live query. */
  onKeep?: () => void;
  /** Cut loose: releases the task (award + undo toast live with the caller). */
  onCutLoose?: () => void;
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
    <VStack className="mx-[30px] -mt-4 mb-[14px] gap-2">
      <TaskHealthPrompt
        flag="avoided"
        onKeep={busy ? undefined : onKeep}
        onCutLoose={busy ? undefined : onCutLoose}
        onBreakDown={busy ? undefined : onGo}
      />
      {busy ? (
        <HStack className="items-center justify-center gap-2">
          <ActivityIndicator size="small" accessibilityLabel="Finding a tiny first step" />
          <Text className="font-body text-sm text-typography-500">
            Finding the smallest step...
          </Text>
        </HStack>
      ) : null}
    </VStack>
  );
}
