import { useEffect, useRef, useState } from 'react';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon, StarIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/**
 * Top-bar star cluster (v1.5 frame 02): `★ 65 +1 today │ ☆ 1 banked` as an
 * open baseline-aligned line, not a bordered pill. Solid star = stars owned;
 * the banked segment (hollow-star semantics) shows stars banked on unfinished
 * tasks and hides at zero. "+N today" never includes banked (spec §2).
 * Presentational — totals come from the route. Tapping opens the activity log.
 *
 * On a total increase the count briefly flashes gold: a state-driven class
 * swap (instant cut, inherently Reduce Motion-safe — no Reanimated).
 */
export function StarCounter({
  total,
  today,
  banked = 0,
  onPress,
}: {
  total: number;
  today: number;
  /** Net stars banked on still-active tasks (hidden when 0). */
  banked?: number;
  onPress?: () => void;
}) {
  const [highlighted, setHighlighted] = useState(false);
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevTotalRef.current;
    prevTotalRef.current = total;
    // Skip first render; only an INCREASE marks an award moment.
    if (prev === null || total <= prev) return;
    setHighlighted(true);
    const timer = setTimeout(() => setHighlighted(false), 900);
    return () => clearTimeout(timer);
  }, [total]);

  return (
    <Pressable
      accessibilityRole="button"
      // The Pressable label collapses inner text for Maestro/screen readers —
      // select by the FULL label, not the digits (1.3 lesson).
      aria-label={`${total} stars, ${today} earned today${banked > 0 ? `, ${banked} banked` : ''}`}
      accessibilityHint="Tap to view star activity log"
      // Announce live total changes politely (AC3).
      accessibilityLiveRegion="polite"
      hitSlop={8}
      onPress={onPress}
      className="h-11 justify-center"
    >
      <HStack className="items-baseline gap-2">
        <Text className="text-base leading-none text-tertiary-500">★</Text>
        <Text
          className={`font-mono text-xl leading-none ${
            highlighted ? 'text-tertiary-600' : 'text-typography-900'
          }`}
        >
          {total}
        </Text>
        {/* Sign-aware: the old hardcoded '+' rendered "+-10" on negative days
            (possible via retractions/undo). Neutral minus, never red. */}
        <Text className="font-body-semibold text-xs text-typography-400">
          {`${today < 0 ? `−${-today}` : `+${today}`} today`}
        </Text>
        {banked > 0 ? (
          <>
            <Box className="h-3.5 w-px self-center bg-outline-200" />
            <HStack className="items-center gap-1 self-center">
              <Icon as={StarIcon} size="2xs" className="text-tertiary-500" />
              <Text className="font-mono text-sm leading-none text-tertiary-700">{banked}</Text>
              <Text className="font-body-semibold text-xs text-tertiary-700">banked</Text>
            </HStack>
          </>
        ) : null}
      </HStack>
    </Pressable>
  );
}
