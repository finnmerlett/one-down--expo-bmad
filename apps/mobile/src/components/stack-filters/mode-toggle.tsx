import type { TaskSize } from '@one-down/shared';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Plural display copy (PRD vocabulary) — distinct from the card back's
// singular SIZE_LABELS ("Quick win") so Maestro selectors never collide.
const MODE_OPTIONS: { size: TaskSize; label: string }[] = [
  { size: 'quick_win', label: 'Quick wins' },
  { size: 'big_time', label: 'Big time' },
];

/**
 * Segmented two-option mode control (Story 3.2). One control, two options,
 * three states: quick wins / big time / neither (re-press deactivates).
 * Deliberately NOT a Switch — a Switch cannot express the third state
 * (readiness-report decision, resolved here). Presentational; the home
 * screen owns the mode state.
 */
export function ModeToggle({
  mode,
  onToggle,
}: {
  mode: TaskSize | null;
  onToggle: (size: TaskSize) => void;
}) {
  // Real segmented control: deep-cream track, active segment white-raised
  // with coral bold text (most legible of the brief's two options).
  return (
    <HStack className="self-center rounded-full bg-background-200 p-1">
      {MODE_OPTIONS.map(({ size, label }) => {
        const selected = mode === size;
        return (
          <Pressable
            key={size}
            accessibilityRole="button"
            // "Mode:" prefix — collision guard vs card-back "Size:" toggles.
            accessibilityLabel={`Mode: ${label}`}
            accessibilityState={{ selected }}
            onPress={() => onToggle(size)}
            className={`h-10 items-center justify-center rounded-full px-6 ${
              selected ? 'bg-background-0 shadow-segment' : 'active:bg-background-300/50'
            }`}
          >
            <Text
              className={
                selected
                  ? 'font-body-bold text-primary-600'
                  : 'font-body-medium text-typography-500'
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
