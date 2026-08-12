import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Box } from '@/components/ui/box';

/**
 * Saved theme sonar dials (designs/v1.5 `syncRipple()` — 9-5 items 2+3).
 * The design's cycle is `duration + pause` with a NEGATIVE pause: the ripple
 * repeats every 2.7s but only ever travels the first 36% of a notional 7.5s
 * full expansion — the tail is clipped, not slowed. Geometry (blur/spread)
 * runs on the EASED progress; opacity runs on the RAW progress and dies at
 * 25% of the full expansion, well before the clipped tail.
 */
const FULL_EXPANSION_MS = 7500;
const PAUSE_MS = -4800;
const CYCLE_MS = FULL_EXPANSION_MS + PAUSE_MS; // 2700
const TRAVEL = CYCLE_MS / FULL_EXPANSION_MS; // 0.36
const RIPPLE_ALPHA = 0.36;
/** Fraction of the FULL expansion where opacity peaks / reaches zero. */
const PEAK_AT = 0.05;
const FADE_AT = 0.25;
const BLUR_START = 3;
const BLUR_END = 70;
const SPREAD_END = 70;
/** "Ripple — fast, then gentle" from the saved theme. */
const RIPPLE_EASE = Easing.bezierFn(0.22, 0.55, 0.5, 0.92);

/**
 * The bonus aura (v1.5 E5 / saved theme, deferred from D2): a badged card
 * gets a static gold halo, plus a slow sonar ripple — one soft bloom
 * sweeping outward every 2.7s. Both are real blurred shadows: the new-arch
 * boxShadow style supports colored blur + spread on Android, and Reanimated
 * animates it for the ripple. No transform: scaling the shadow-casting rect
 * pushed its edge past the card face and exposed the shadow's hard start
 * (the 9-5 item 3 "hard inner edge") — blur+spread growth keeps the rect
 * under the opaque card the whole cycle. Reduce Motion keeps the halo and
 * drops the ripple. Rendered INSIDE the card's animated frame so it rides
 * drags and fly-offs.
 */
export function BonusAura() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress, reduceMotion]);

  // Animated boxShadow (new-arch): the ripple is a soft shadow bloom that
  // widens and fades — a true blurred pulse, not a hardening border.
  const rippleStyle = useAnimatedStyle(() => {
    // Raw progress of the notional FULL expansion (0 → TRAVEL each cycle).
    const t = progress.value * TRAVEL;
    const eased = RIPPLE_EASE(t);
    // Linear ramp up to the peak, then linear fade to zero at FADE_AT.
    const fadeOut = t >= FADE_AT ? 0 : RIPPLE_ALPHA * (1 - t / FADE_AT);
    const peakAlpha = RIPPLE_ALPHA * (1 - PEAK_AT / FADE_AT);
    const alphaRaw = t < PEAK_AT ? peakAlpha * (t / PEAK_AT) : fadeOut;
    // Fixed precision: raw float math can land on denormals like 6e-16,
    // which the rgba parser rejects (scientific notation).
    const alpha = alphaRaw <= 0 ? '0' : alphaRaw.toFixed(3);
    const blur = (BLUR_START + (BLUR_END - BLUR_START) * eased).toFixed(1);
    const spread = (SPREAD_END * eased).toFixed(1);
    return {
      boxShadow: `0 0 ${blur}px ${spread}px rgba(185,138,50,${alpha})`,
    };
  });

  return (
    <>
      {/* Static halo — a REAL blurred glow, single layer per the saved theme
          (blur 9 / spread 1 / α .5). The card's opaque face covers the
          shadow rectangle behind it, so only the outward bloom shows. */}
      <Box
        pointerEvents="none"
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 22,
          boxShadow: '0 0 9px 1px rgba(185,138,50,0.5)',
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
