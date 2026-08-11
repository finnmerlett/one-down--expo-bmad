import { APPEARANCE_MODES, type AppearanceMode } from '@/services/appearance';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

const MODE_LABELS: Record<AppearanceMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * Appearance control (D7): caps label + a three-chip segmented choice.
 * "System" follows the OS scheme only after the next APK rebuild flips
 * `userInterfaceStyle` — the hint line keeps that honest.
 */
export function AppearanceSection({
  mode,
  onChange,
}: {
  mode: AppearanceMode;
  onChange: (mode: AppearanceMode) => void;
}) {
  return (
    <VStack className="gap-2.5">
      <Text className="font-mono text-xs uppercase tracking-caps text-typography-400">
        Appearance
      </Text>
      <HStack className="gap-2">
        {APPEARANCE_MODES.map((candidate) => {
          const selected = mode === candidate;
          return (
            <Pressable
              key={candidate}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              aria-label={`Appearance: ${MODE_LABELS[candidate]}`}
              onPress={() => onChange(candidate)}
              className={`rounded-full border px-4 py-2 ${
                selected ? 'border-primary-300 bg-primary-50' : 'border-outline-200 bg-background-0'
              }`}
            >
              <Text
                className={
                  selected
                    ? 'font-body-semibold text-sm text-primary-700'
                    : 'font-body-medium text-sm text-typography-600'
                }
              >
                {MODE_LABELS[candidate]}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    </VStack>
  );
}
