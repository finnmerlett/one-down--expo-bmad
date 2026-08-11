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

/** Saved theme sonar props: gold #B98A32 (inlined in the rgba strings),
 *  7.5s period. */
const PERIOD_MS = 7500;
const SWEEP_MS = 2200;

/**
 * The bonus aura (v1.5 E5 / saved theme, deferred from D2): a badged card
 * gets a static gold halo, plus a slow sonar ripple — one soft bloom
 * sweeping outward every 7.5s. Both are real blurred shadows: the new-arch
 * boxShadow style supports colored blur + spread on Android, and Reanimated
 * animates it for the ripple. Reduce Motion keeps the halo and drops the
 * ripple. Rendered INSIDE the card's animated frame so it rides drags and
 * fly-offs.
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

  // Animated boxShadow (new-arch): the ripple is a soft shadow bloom that
  // widens and fades — a true blurred pulse, not a hardening border.
  const rippleStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Fixed precision: raw float math can land on denormals like 6e-16,
    // which the rgba parser rejects (scientific notation).
    const alpha = p === 0 ? '0' : (0.4 * (1 - p)).toFixed(3);
    const blur = (10 + p * 26).toFixed(1);
    const spread = (2 + p * 16).toFixed(1);
    return {
      boxShadow: `0 0 ${blur}px ${spread}px rgba(185,138,50,${alpha})`,
      transform: [{ scale: 1 + p * 0.1 }],
    };
  });

  return (
    <>
      {/* Static halo — a REAL blurred glow: RN's new-arch boxShadow supports
          blur + spread on Android (the card's opaque face covers the shadow
          rectangle behind it, so only the outward bloom shows). */}
      <Box
        pointerEvents="none"
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 22,
          boxShadow: '0 0 12px 3px rgba(185,138,50,0.5), 0 0 30px 10px rgba(185,138,50,0.25)',
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
          },
          rippleStyle,
        ]}
      />
    </>
  );
}
