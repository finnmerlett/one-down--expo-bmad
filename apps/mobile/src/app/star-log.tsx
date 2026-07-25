import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { StarActivityLog, type StarLogFilter } from '@/components/star-log/star-activity-log';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useStarActivity } from '@/hooks/use-star-activity';
import { startOfLocalDay } from '@/services/star-totals';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Star activity log route (Story 4.3) — full-screen push from the top-bar
// counter, mirroring the task-list pattern. Default filter: All time (AC3 —
// the log shows ALL transactions on open).
export default function StarLogScreen() {
  const router = useRouter();
  const entries = useStarActivity();
  const [filter, setFilter] = useState<StarLogFilter>('all_time');

  // Same device-local midnight rule as the counter's daily total (4.2).
  const dayStart = startOfLocalDay(new Date()).getTime();
  const visibleEntries =
    filter === 'today' ? entries.filter((entry) => entry.createdAt.getTime() >= dayStart) : entries;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="text-xl font-semibold text-typography-900">Star activity</Text>
      </HStack>
      <StarActivityLog entries={visibleEntries} filter={filter} onFilterChange={setFilter} />
    </SafeAreaView>
  );
}
