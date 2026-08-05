import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Toast, useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';

/**
 * The completion moment (v1.5 spec §5, ~560ms): a dark pill — pulsing gold
 * star, `One down!` in the title face, `+15 · 80 TOTAL` in mono — with five
 * gold stars flying on wide arcs over a radial bloom. One quiet crescendo,
 * fully skipped under Reduce Motion (the pill still shows). Released/undo
 * toasts reuse the pill without the burst.
 *
 * Rendered via `useToast().show({ placement: 'top', ... })` at the provider
 * root, so it survives the route pop that follows Done/Cut it loose. The
 * polite live region announces the award without interrupting.
 */

const BURST_STARS = [
  { dx: -78, dy: -60, size: 26, delay: 0 },
  { dx: 70, dy: -66, size: 19, delay: 100 },
  { dx: 88, dy: 28, size: 22, delay: 200 },
  { dx: -86, dy: 34, size: 16, delay: 60 },
  { dx: -4, dy: -80, size: 14, delay: 280 },
] as const;

function BurstStar({ dx, dy, size, delay }: (typeof BURST_STARS)[number]) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.16 ? progress.value / 0.16 : 1 - (progress.value - 0.16) / 0.84,
    transform: [
      { translateX: progress.value * dx },
      { translateY: progress.value * dy },
      { scale: 0.5 + progress.value * 0.5 },
    ],
  }));
  return (
    // Plain style objects: reanimated's Animated.View is not registered with
    // the css-interop runtime, so className here is at best ignored.
    <Animated.View style={[{ position: 'absolute' }, style]} pointerEvents="none">
      <Text style={{ fontSize: size, color: '#DBAE55' }}>★</Text>
    </Animated.View>
  );
}

function Bloom() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.3 ? (progress.value / 0.3) * 0.95 : 0.95 * (1 - progress.value),
    transform: [{ scale: 0.35 + progress.value * 2.25 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]} pointerEvents="none">
      <Svg width={140} height={140}>
        <Defs>
          <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#B98A32" stopOpacity={0.62} />
            <Stop offset="100%" stopColor="#B98A32" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={70} cy={70} r={70} fill="url(#bloom)" />
      </Svg>
    </Animated.View>
  );
}

function PulsingStar({ celebrate }: { celebrate: boolean }) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!celebrate || reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
      ),
      2,
    );
  }, [celebrate, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Text className="text-[21px] leading-6 text-[#DBAE55]">★</Text>
    </Animated.View>
  );
}

export function RewardToast({
  nativeID,
  title,
  stars,
  total,
  celebrate = false,
  onUndo,
}: {
  nativeID: string;
  title: string;
  stars: number;
  /** Running total AFTER the award — renders `+N · T TOTAL` when provided. */
  total?: number;
  /** The full completion moment: star burst + bloom + pulse (~560ms). */
  celebrate?: boolean;
  onUndo?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const burst = celebrate && !reduceMotion;
  const subline =
    total !== undefined
      ? `+${stars} · ${total} TOTAL`
      : `+${stars} ${stars === 1 ? 'star' : 'stars'}`;

  return (
    <Toast
      nativeID={nativeID}
      accessible
      accessibilityLiveRegion="polite"
      // The dark pill IS the toast — kill the default surface chrome.
      className="mt-2 items-center border-0 bg-transparent p-0 shadow-none"
    >
      <Box className="items-center justify-center">
        {burst ? (
          <Box pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Bloom />
            {BURST_STARS.map((star) => (
              <BurstStar key={`${star.dx}:${star.dy}`} {...star} />
            ))}
          </Box>
        ) : null}
        <HStack className="items-center gap-3 rounded-full bg-[#2C2723] py-3.5 pl-[22px] pr-3.5 shadow-toast">
          <PulsingStar celebrate={burst} />
          <VStack>
            <Text className="font-heading text-base leading-5 text-[#F7F1E8]">{title}</Text>
            <Text className="font-mono text-[11.5px] tracking-caps-tight text-[#B5AA9A]">
              {subline}
            </Text>
          </VStack>
          {onUndo ? (
            <Pressable
              accessibilityRole="button"
              aria-label="Undo"
              onPress={onUndo}
              className="ml-2 h-[31px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.28)] px-3.5 active:bg-[rgba(255,255,255,0.08)]"
            >
              <Text className="font-body-semibold text-[12.5px] text-[#F7F1E8]">Undo</Text>
            </Pressable>
          ) : null}
        </HStack>
      </Box>
    </Toast>
  );
}

/**
 * Show the standard reward toast — one helper so the presentation stays
 * identical across every surface (complete, Cut it loose from the working
 * screen / overlay / list detail). An undoable toast stays up longer
 * (~5 s vs ~2 s): tapping Undo closes it and reverses the action.
 */
export function showRewardToast(
  toast: ReturnType<typeof useToast>,
  {
    title,
    stars,
    total,
    celebrate,
    onUndo,
  }: { title: string; stars: number; total?: number; celebrate?: boolean; onUndo?: () => void },
): void {
  toast.show({
    placement: 'top',
    duration: onUndo ? 5000 : 2000,
    render: ({ id }) => (
      <RewardToast
        nativeID={`toast-${id}`}
        title={title}
        stars={stars}
        total={total}
        celebrate={celebrate}
        onUndo={
          onUndo
            ? () => {
                toast.close(id);
                onUndo();
              }
            : undefined
        }
      />
    ),
  });
}
