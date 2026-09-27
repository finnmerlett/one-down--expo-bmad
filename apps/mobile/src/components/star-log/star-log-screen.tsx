import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { StarActivityData } from '@one-down/shared';

import { StarActivityLog, type StarLogFilter } from '@/components/star-log/star-activity-log';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole star activity screen as the user sees it — header and the
 * filterable log — driven entirely by props. `entries` are the ones to SHOW
 * (already filtered). src/app/star-log.tsx supplies the data and filtering;
 * the screen stories (and so the design canvas) supply fixtures.
 */
export function StarLogScreen({
  entries,
  filter,
  onFilterChange,
  onBack,
}: {
  entries: StarActivityData[];
  filter: StarLogFilter;
  onFilterChange: (filter: StarLogFilter) => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="font-heading text-2xl text-typography-900">Star activity</Text>
      </HStack>
      <StarActivityLog entries={entries} filter={filter} onFilterChange={onFilterChange} />
    </SafeAreaView>
  );
}
