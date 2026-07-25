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

/** List surface (Story 7.1): the active overview vs the recycle bin tab. */
export type TaskListMode = 'active' | 'bin';

/**
 * Partition tasks for the overview list (Story 4.4, pure): `done` =
 * completed, sorted by `updatedAt` ASCENDING — oldest completion at the top,
 * the latest wins closest to the "To do" boundary (AC4; updatedAt is the
 * completion-time proxy — completed tasks are no longer editable in-app).
 * `todo` = pending/in_progress in the incoming (newest-first) order.
 * Cut-loose and archived tasks appear in NEITHER — they live in the recycle
 * bin tab (Story 7.1).
 */
export function splitTasksForList(tasks: TaskData[]): { done: TaskData[]; todo: TaskData[] } {
  const todo = tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
  const done = tasks
    .filter((task) => task.status === 'completed')
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  return { done, todo };
}

/**
 * Recycle bin contents (Story 7.1, pure): archived + cut-loose tasks, most
 * recently binned first (updatedAt is the bin-entry proxy — both transitions
 * are the row's last status write).
 */
export function binTasksForList(tasks: TaskData[]): TaskData[] {
  return tasks
    .filter((task) => task.status === 'archived' || task.status === 'cut_loose')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** Multi-select row a11y label (Story 7.1 AC1): state is announced in the label. */
function selectionLabel(task: TaskData, selected: boolean): string {
  return selected ? `Selected, task: ${task.title}` : `Select task: ${task.title}`;
}

// Left-edge check circle shown on every row while selecting — a hand-rolled
// indicator (Pressable + icon, repo pattern) rather than a form checkbox: the
// whole row is the touch target.
function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <Box
      className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
        selected ? 'border-primary-600 bg-primary-600' : 'border-outline-400 bg-background-0'
      }`}
    >
      {selected ? <Icon as={CheckIcon} size="sm" className="text-typography-0" /> : null}
    </Box>
  );
}

function TaskRow({
  task,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  task: TaskData;
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
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
      aria-label={selecting ? selectionLabel(task, selected) : `Open task: ${task.title}`}
      accessibilityState={selecting ? { selected } : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      className="rounded-2xl border border-outline-100 bg-background-0 px-4 py-3.5 active:bg-background-50"
    >
      <HStack className="items-center gap-3">
        {selecting ? <SelectionIndicator selected={selected} /> : null}
        <VStack className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="font-body-semibold text-base text-typography-900">
            {task.title}
          </Text>
          {meta.length > 0 ? (
            <Text numberOfLines={1} className="font-body text-sm text-typography-500">
              {meta.join(' · ')}
            </Text>
          ) : null}
        </VStack>
        {selecting ? null : (
          <Icon as={ChevronRightIcon} size="md" className="text-typography-400" />
        )}
      </HStack>
    </Pressable>
  );
}

// Completed rows are a calm achievement record (Story 4.4): check icon,
// muted title, completion date — display-only outside multi-select (no
// navigation to a card back offering Start on a finished task, AC6).
// `accessible={false}` outside selection so inner text stays visible to
// Maestro (todo rows keep the `Open task:` label — selectors can't collide);
// the long-press still bubbles to this Pressable, so a done row can enter
// multi-select too (archiving completed tasks is the 7.1 warned path).
function DoneRow({
  task,
  selecting,
  selected,
  onPress,
  onLongPress,
}: {
  task: TaskData;
  selecting: boolean;
  selected: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessible={selecting}
      accessibilityRole={selecting ? 'button' : undefined}
      aria-label={selecting ? selectionLabel(task, selected) : undefined}
      accessibilityState={selecting ? { selected } : undefined}
      onPress={selecting ? onPress : undefined}
      onLongPress={onLongPress}
      className="rounded-2xl bg-background-50 px-4 py-3"
    >
      <HStack className="items-center gap-3">
        {selecting ? (
          <SelectionIndicator selected={selected} />
        ) : (
          <Box className="h-6 w-6 items-center justify-center rounded-full bg-success-50">
            <Icon as={CheckIcon} size="sm" className="text-success-600" />
          </Box>
        )}
        <VStack className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="font-body text-base text-typography-500">
            {task.title}
          </Text>
          <Text className="font-body text-sm text-typography-400">
            {task.updatedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        </VStack>
      </HStack>
    </Pressable>
  );
}

// Recycle bin row (Story 7.1, AC4/AC6): origin label + a per-row Restore
// button. The button must be a SIBLING of the labeled row pressable — nested
// pressables inside an accessible container are flattened away from
// TalkBack/Maestro. Hidden while selecting (the bulk bar owns actions then).
function BinRow({
  task,
  selecting,
  selected,
  onToggleSelect,
  onLongPress,
  onRestore,
}: {
  task: TaskData;
  selecting: boolean;
  selected: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
  onRestore?: () => void;
}) {
  return (
    <HStack className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        aria-label={selecting ? selectionLabel(task, selected) : `Bin task: ${task.title}`}
        accessibilityState={selecting ? { selected } : undefined}
        onPress={selecting ? onToggleSelect : undefined}
        onLongPress={onLongPress}
        className="flex-1 rounded-2xl border border-outline-100 bg-background-0 px-4 py-3.5 active:bg-background-50"
      >
        <HStack className="items-center gap-3">
          {selecting ? <SelectionIndicator selected={selected} /> : null}
          <VStack className="flex-1 gap-0.5">
            <Text numberOfLines={1} className="font-body-medium text-base text-typography-700">
              {task.title}
            </Text>
            <Text className="font-body text-sm text-typography-500">
              {task.status === 'archived' ? 'Archived' : 'Cut loose'}
            </Text>
          </VStack>
        </HStack>
      </Pressable>
      {selecting ? null : (
        <Pressable
          accessibilityRole="button"
          aria-label={`Restore task: ${task.title}`}
          hitSlop={8}
          onPress={onRestore}
          className="h-11 items-center justify-center rounded-full bg-background-0 px-4 shadow-segment active:bg-background-100"
        >
          <Text className="font-body-bold text-sm text-primary-600">Restore</Text>
        </Pressable>
      )}
    </HStack>
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
 *
 * Story 7.1: `mode="bin"` renders the recycle bin (archived + cut-loose rows
 * with Restore). A non-null `selectedIds` set puts EITHER mode into
 * multi-select — rows toggle membership instead of navigating; the screen
 * owns the selection state and the bulk action bar.
 */
export function TaskListView({
  tasks,
  onTaskPress,
  onAddPress,
  mode = 'active',
  selectedIds = null,
  onToggleSelect,
  onLongPressTask,
  onRestore,
}: {
  tasks: TaskData[];
  onTaskPress: (task: TaskData) => void;
  /** Empty-state CTA (Story 3.4) — the route opens the home quick-add sheet. */
  onAddPress?: () => void;
  /** Story 7.1 — 'active' overview (default) or the recycle 'bin' tab. */
  mode?: TaskListMode;
  /** Story 7.1 — non-null while multi-selecting (may be empty). */
  selectedIds?: ReadonlySet<string> | null;
  onToggleSelect?: (task: TaskData) => void;
  /** Long-press on any row — the screen enters multi-select with that task. */
  onLongPressTask?: (task: TaskData) => void;
  /** Bin rows only — frictionless single-task restore (no confirm). */
  onRestore?: (task: TaskData) => void;
}) {
  const selecting = selectedIds !== null;
  const isSelected = (task: TaskData) => selectedIds?.has(task.id) ?? false;

  const sections: ListSection[] = (() => {
    if (mode === 'bin') {
      const bin = binTasksForList(tasks);
      return bin.length > 0 ? [{ key: 'bin', title: null, data: bin }] : [];
    }
    const { done, todo } = splitTasksForList(tasks);
    if (done.length > 0) {
      return [
        { key: 'done', title: 'Done', data: done },
        { key: 'todo', title: 'To do', data: todo },
      ];
    }
    return todo.length > 0 ? [{ key: 'todo', title: null, data: todo }] : [];
  })();

  // One-shot entry scroll (AC2): once content is laid out, park the "To do"
  // header DONE_PEEK_OFFSET px down so ~2 done rows peek above it. Skipped
  // when everything already fits above the fold (≤2 done tasks) and in the
  // bin (single section).
  const listRef = useRef<SectionList<TaskData, { key: string; title: string | null }>>(null);
  const didEntryScrollRef = useRef(false);
  const handleContentSizeChange = () => {
    if (didEntryScrollRef.current || sections.length < 2 || (sections[0]?.data.length ?? 0) <= 2) {
      return;
    }
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
        section.key === 'bin' ? (
          <BinRow
            task={item}
            selecting={selecting}
            selected={isSelected(item)}
            onToggleSelect={() => onToggleSelect?.(item)}
            onLongPress={() => onLongPressTask?.(item)}
            onRestore={() => onRestore?.(item)}
          />
        ) : section.key === 'done' ? (
          <DoneRow
            task={item}
            selecting={selecting}
            selected={isSelected(item)}
            onPress={() => onToggleSelect?.(item)}
            onLongPress={() => onLongPressTask?.(item)}
          />
        ) : (
          <TaskRow
            task={item}
            selecting={selecting}
            selected={isSelected(item)}
            onPress={() => (selecting ? onToggleSelect?.(item) : onTaskPress(item))}
            onLongPress={() => onLongPressTask?.(item)}
          />
        )
      }
      renderSectionHeader={({ section }) =>
        section.title ? (
          <Text className="pb-1.5 pt-3 font-heading text-lg text-typography-900">
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
          {mode === 'bin' ? (
            <EmptyState title="Nothing here" body="Everything's active." />
          ) : (
            <EmptyState
              title="No tasks yet"
              body="Tasks you add will show up here."
              actionLabel="Add a task"
              onAction={onAddPress}
            />
          )}
        </Box>
      }
      className="flex-1"
      contentContainerClassName="gap-2 px-4 pb-8"
    />
  );
}
