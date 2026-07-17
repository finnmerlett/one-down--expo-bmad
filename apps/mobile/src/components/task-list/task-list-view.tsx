import { useRef } from 'react';
import { SectionList, type SectionListData } from 'react-native';

import { parseTaskContexts, type TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { CheckIcon, ChevronRightIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CONTEXT_LABELS, SIZE_LABELS } from '@/components/card-stack/task-card';
import { EmptyState } from '@/components/empty-state/empty-state';

/**
 * Partition tasks for the overview list (Story 4.4, pure): `done` =
 * completed, sorted by `updatedAt` ASCENDING — oldest completion at the top,
 * the latest wins closest to the "To do" boundary (AC4; updatedAt is the
 * completion-time proxy — completed tasks are no longer editable in-app).
 * `todo` = pending/in_progress in the incoming (newest-first) order.
 * Cut-loose tasks appear in NEITHER — the recycle bin arrives in Epic 7.
 */
export function splitTasksForList(tasks: TaskData[]): { done: TaskData[]; todo: TaskData[] } {
  const todo = tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
  const done = tasks
    .filter((task) => task.status === 'completed')
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  return { done, todo };
}

function TaskRow({ task, onPress }: { task: TaskData; onPress: () => void }) {
  const contexts = parseTaskContexts(task.contexts);
  const meta = [
    task.size ? SIZE_LABELS[task.size] : null,
    ...contexts.map((context) => (CONTEXT_LABELS as Record<string, string>)[context] ?? context),
    task.deadline
      ? task.deadline.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <Pressable
      accessibilityRole="button"
      aria-label={`Open task: ${task.title}`}
      onPress={onPress}
      className="rounded-2xl border border-outline-200 bg-background-0 px-4 py-3 active:bg-background-50"
    >
      <HStack className="items-center gap-3">
        <VStack className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base font-medium text-typography-900">
            {task.title}
          </Text>
          {meta.length > 0 ? (
            <Text numberOfLines={1} className="text-sm text-typography-500">
              {meta.join(' · ')}
            </Text>
          ) : null}
        </VStack>
        <Icon as={ChevronRightIcon} size="md" className="text-typography-400" />
      </HStack>
    </Pressable>
  );
}

// Completed rows are a calm achievement record (Story 4.4): check icon,
// muted title, completion date — display-only, no chevron, no press target
// (no navigation to a card back offering Start on a finished task, AC6).
// Plain View, NOT a labeled Pressable, so inner text stays visible to
// Maestro (todo rows keep the `Open task:` label — selectors can't collide).
function DoneRow({ task }: { task: TaskData }) {
  return (
    <Box className="rounded-2xl border border-outline-100 bg-background-50 px-4 py-3">
      <HStack className="items-center gap-3">
        <Icon as={CheckIcon} size="md" className="text-success-500" />
        <VStack className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-base text-typography-500">
            {task.title}
          </Text>
          <Text className="text-sm text-typography-500">
            {task.updatedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );
}

type ListSection = SectionListData<TaskData, { key: string; title: string | null }>;

// Roughly two done rows (~64px each) + gaps stay peeking above the "To do"
// header after the entry scroll (AC2) — approximate by design, "a couple
// visible" is the bar.
const DONE_PEEK_OFFSET = 140;

/**
 * Scrollable backlog overview (Story 4.4): completed tasks in a "Done"
 * section at the TOP — opening the list leads with what you've accomplished
 * (achievement framing), while the entry scroll parks "To do" near the top
 * so the list stays actionable; scroll UP for the pride tour. With no done
 * tasks both headers disappear (pre-done-section look, AC3).
 */
export function TaskListView({
  tasks,
  onTaskPress,
  onAddPress,
}: {
  tasks: TaskData[];
  onTaskPress: (task: TaskData) => void;
  /** Empty-state CTA (Story 3.4) — the route opens the home quick-add sheet. */
  onAddPress?: () => void;
}) {
  const { done, todo } = splitTasksForList(tasks);

  const sections: ListSection[] =
    done.length > 0
      ? [
          { key: 'done', title: 'Done', data: done },
          { key: 'todo', title: 'To do', data: todo },
        ]
      : todo.length > 0
        ? [{ key: 'todo', title: null, data: todo }]
        : [];

  // One-shot entry scroll (AC2): once content is laid out, park the "To do"
  // header DONE_PEEK_OFFSET px down so ~2 done rows peek above it. Skipped
  // when everything already fits above the fold (≤2 done tasks).
  const listRef = useRef<SectionList<TaskData, { key: string; title: string | null }>>(null);
  const didEntryScrollRef = useRef(false);
  const handleContentSizeChange = () => {
    if (didEntryScrollRef.current || done.length <= 2) return;
    didEntryScrollRef.current = true;
    listRef.current?.scrollToLocation({
      sectionIndex: 1,
      itemIndex: 0,
      viewPosition: 0,
      viewOffset: DONE_PEEK_OFFSET,
      animated: false,
    });
  };

  return (
    <SectionList
      ref={listRef}
      sections={sections}
      keyExtractor={(task) => task.id}
      renderItem={({ item, section }) =>
        section.key === 'done' ? (
          <DoneRow task={item} />
        ) : (
          <TaskRow task={item} onPress={() => onTaskPress(item)} />
        )
      }
      renderSectionHeader={({ section }) =>
        section.title ? (
          <Text className="pb-1 pt-2 text-lg font-semibold text-typography-900">
            {section.title}
          </Text>
        ) : null
      }
      onContentSizeChange={handleContentSizeChange}
      // Variable row heights make the target approximate; retry once the
      // render window settles.
      onScrollToIndexFailed={() => {
        setTimeout(() => {
          listRef.current?.scrollToLocation({
            sectionIndex: 1,
            itemIndex: 0,
            viewPosition: 0,
            viewOffset: DONE_PEEK_OFFSET,
            animated: false,
          });
        }, 100);
      }}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        <Box className="py-8">
          <EmptyState
            title="No tasks yet"
            body="Tasks you add will show up here."
            actionLabel="Add a task"
            onAction={onAddPress}
          />
        </Box>
      }
      className="flex-1"
      contentContainerClassName="gap-2 px-4 pb-8"
    />
  );
}
