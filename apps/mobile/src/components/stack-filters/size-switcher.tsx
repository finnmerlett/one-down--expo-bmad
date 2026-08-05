import type { TaskSize } from '@one-down/shared';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

const OPTIONS: { value: TaskSize | null; label: string }[] = [
  { value: 'quick_win', label: 'Quick wins' },
  { value: 'big_time', label: 'Big time' },
  { value: null, label: 'All' },
];

/**
 * Detached size switcher (v1.5 frame 02): a floating pill under the context
 * bar, right-aligned with its own shadow — reads as a filter over the deck
 * rather than part of the bar. Same tri-state as the sheet's HOW MUCH TIME
 * segmented (null renders as `All` here, `Either` there).
 */
export function SizeSwitcher({
  mode,
  onSetMode,
}: {
  mode: TaskSize | null;
  onSetMode: (mode: TaskSize | null) => void;
}) {
  return (
    <HStack className="gap-0.5 self-end rounded-full border border-outline-100 bg-background-0 p-[3px] shadow-float">
      {OPTIONS.map(({ value, label }) => {
        const selected = mode === value;
        return (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Mode: ${label}`}
            accessibilityState={{ selected }}
            onPress={() => onSetMode(value)}
            className={`h-[26px] items-center justify-center rounded-full px-3 ${
              selected ? 'bg-primary-100' : 'active:bg-background-200'
            }`}
          >
            <Text
              className={
                selected
                  ? 'font-body-bold text-[11.5px] text-primary-600'
                  : 'font-body-semibold text-[11.5px] text-typography-500'
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
