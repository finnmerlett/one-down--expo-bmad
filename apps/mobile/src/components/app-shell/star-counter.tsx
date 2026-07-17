import { useEffect, useRef, useState } from 'react';

import { HStack } from '@/components/ui/hstack';
import { Icon, StarIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/**
 * Top-bar star counter (Story 4.2, UX P1 "StarCounter"): grand total AND
 * today's earnings, always together (FR48 — persistent progress context).
 * Presentational — totals come from the route via useStarTotals. Tapping
 * opens the activity log (wired in 4.3 via onPress).
 *
 * On a total increase the box briefly highlights: a state-driven class swap
 * (instant cut, inherently Reduce Motion-safe — no Reanimated).
 */
export function StarCounter({
  total,
  today,
  onPress,
}: {
  total: number;
  today: number;
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
      aria-label={`${total} stars, ${today} earned today`}
      accessibilityHint="Tap to view star activity log"
      // Announce live total changes politely (AC3).
      accessibilityLiveRegion="polite"
      hitSlop={8}
      onPress={onPress}
      className={`h-11 justify-center rounded-lg border border-outline-200 px-3 active:bg-background-100 ${
        highlighted ? 'bg-warning-100' : 'bg-background-50'
      }`}
    >
      <HStack className="items-center gap-1.5">
        <Icon as={StarIcon} size="sm" className="text-warning-400" />
        <Text className="text-sm font-medium text-typography-700">{total}</Text>
        <Text className="text-xs text-typography-500">{`+${today} today`}</Text>
      </HStack>
    </Pressable>
  );
}
