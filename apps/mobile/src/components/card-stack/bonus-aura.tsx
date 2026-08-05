import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Box } from '@/components/ui/box';

/** Saved theme sonar props: gold #B98A32, 7.5s period, alpha .36. */
const GOLD = '#B98A32';
const PERIOD_MS = 7500;
const SWEEP_MS = 2200;

/**
 * The bonus aura (v1.5 E5 / saved theme, deferred from D2): a badged card
 * gets a static gold halo, plus a slow sonar ripple — one ring sweeping
 * outward every 7.5s. Android can't blur colored shadows, so the halo is
 * two soft border layers and the ripple a widening, fading rounded outline.
 * Reduce Motion keeps the halo and drops the ripple. Rendered INSIDE the
 * card's animated frame so it rides drags and fly-offs.
 */
export function BonusAura() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withDelay(
        PERIOD_MS - SWEEP_MS,
        withTiming(1, { duration: SWEEP_MS, easing: Easing.out(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [progress, reduceMotion]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.36 * (1 - progress.value),
    borderWidth: 1.5 + progress.value * 8,
    transform: [{ scale: 1 + progress.value * 0.12 }],
  }));

  return (
    <>
      {/* Static halo — glow blur 9 approximated with two soft rings. */}
      <Box
        pointerEvents="none"
        className="absolute rounded-[26px]"
        style={{
          left: -5,
          right: -5,
          top: -5,
          bottom: -5,
          borderWidth: 2,
          borderColor: 'rgba(185,138,50,0.5)',
        }}
      />
      <Box
        pointerEvents="none"
        className="absolute rounded-[30px]"
        style={{
          left: -10,
          right: -10,
          top: -10,
          bottom: -10,
          borderWidth: 5,
          borderColor: 'rgba(185,138,50,0.16)',
        }}
      />
      {/* Sonar ripple — plain style objects (reanimated views are not
          css-interop registered). */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 22,
            borderColor: GOLD,
          },
          rippleStyle,
        ]}
      />
    </>
  );
}
