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
  return (
    <HStack className="self-center rounded-full border border-outline-200 bg-background-0">
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
            className={`h-11 items-center justify-center rounded-full px-5 active:bg-background-100 ${
              selected ? 'bg-primary-100' : ''
            }`}
          >
            <Text className={selected ? 'font-medium text-primary-700' : 'text-typography-600'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
