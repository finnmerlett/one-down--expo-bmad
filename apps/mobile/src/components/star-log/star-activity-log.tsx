import { FlatList } from 'react-native';

import type { StarAction, StarActivityData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { EmptyState } from '@/components/empty-state/empty-state';
import { startOfLocalDay } from '@/services/star-totals';

export type StarLogFilter = 'today' | 'all_time';

// Covers ALL StarActions now so Epic 6 rows render without a code change.
const ACTION_LABELS: Record<StarAction, string> = {
  task_completed: 'Completed',
  task_cut_loose: 'Cut loose',
  subtask_completed: 'Subtask done',
  subtask_deleted: 'Subtask removed',
  triage_confirmed: 'Info confirmed',
  // Story 7.1 — negative retraction row; the amount renders neutral, not red.
  archive_retraction: 'Archived',
};

// Today -> time only; older -> "12 Jun, 14:32" (task-list date conventions).
function formatTimestamp(createdAt: Date, now: Date): string {
  const time = createdAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (createdAt.getTime() >= startOfLocalDay(now).getTime()) return time;
  const date = createdAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${date}, ${time}`;
}

// Achievement surface: action + task name lead, the amount is the accent.
// Positive in success green; negative (future reversals) NEUTRAL — never
// red/error (no negative framing). NOT a labeled Pressable: rows aren't
// tappable, so inner text stays visible to Maestro.
function ActivityRow({ entry, now }: { entry: StarActivityData; now: Date }) {
  const amountLabel = entry.amount < 0 ? `−${-entry.amount}` : `+${entry.amount}`;
  return (
    <Box className="rounded-2xl border border-outline-200 bg-background-0 px-4 py-3">
      <HStack className="items-center gap-3">
        <VStack className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-typography-900">
            {`${ACTION_LABELS[entry.action]} · ${entry.taskTitle}`}
          </Text>
          <Text className="text-sm text-typography-500">
            {formatTimestamp(entry.createdAt, now)}
          </Text>
        </VStack>
        <Text
          className={`text-base font-semibold ${
            entry.amount < 0 ? 'text-typography-500' : 'text-success-600'
          }`}
        >
          {amountLabel}
        </Text>
      </HStack>
    </Box>
  );
}

function FilterSegment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`h-11 flex-1 items-center justify-center rounded-lg ${
        selected ? 'bg-background-100' : ''
      }`}
    >
      <Text
        className={`text-sm ${
          selected ? 'font-semibold text-typography-900' : 'text-typography-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Star activity log (Story 4.3, UX P2 "StarActivityLog"): chronological
 * transaction list, newest first. Presentational — the route filters entries
 * (device-local midnight rule shared with 4.2) and owns the filter state.
 */
export function StarActivityLog({
  entries,
  filter,
  onFilterChange,
}: {
  entries: StarActivityData[];
  filter: StarLogFilter;
  onFilterChange: (filter: StarLogFilter) => void;
}) {
  const now = new Date();
  return (
    <VStack className="flex-1">
      <HStack className="mx-4 mb-2 gap-1 rounded-xl border border-outline-200 p-1">
        <FilterSegment
          label="Today"
          selected={filter === 'today'}
          onPress={() => onFilterChange('today')}
        />
        <FilterSegment
          label="All time"
          selected={filter === 'all_time'}
          onPress={() => onFilterChange('all_time')}
        />
      </HStack>
      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <ActivityRow entry={item} now={now} />}
        ListEmptyComponent={
          <Box className="py-8">
            {filter === 'today' ? (
              <EmptyState title="None today yet" body="Stars you earn today will appear here." />
            ) : (
              <EmptyState
                title="No stars yet"
                body="Complete or release a task and your stars will show up here."
              />
            )}
          </Box>
        }
        className="flex-1"
        contentContainerClassName="gap-2 px-4 pb-8"
      />
    </VStack>
  );
}
