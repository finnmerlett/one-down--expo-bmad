import { FlatList } from 'react-native';

import { parseTaskContexts, type TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ChevronRightIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CONTEXT_LABELS, SIZE_LABELS } from '@/components/card-stack/task-card';
import { EmptyState } from '@/components/empty-state/empty-state';

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

// Completed rows are a calm achievement record (Story 2.3): display-only —
// no press target, muted styling. Viewing/restoring lands in Epic 7. The
// distinct `Completed:` label prefix keeps selectors unambiguous vs the
// pressable `Open task:` rows.
function DoneRow({ task }: { task: TaskData }) {
  return (
    <Box
      accessible
      aria-label={`Completed: ${task.title}`}
      className="rounded-2xl border border-outline-100 bg-background-50 px-4 py-3"
    >
      <Text numberOfLines={1} className="text-base text-typography-500">
        {task.title}
      </Text>
    </Box>
  );
}

// Done section renders inside ListHeaderComponent — done lists stay short
// pre-Epic-7, so one FlatList over `todo` avoids SectionList churn. Hiding
// the header entirely when empty is Story 4.4.
function ListHeader({ done }: { done: TaskData[] }) {
  return (
    <VStack className="pb-3 pt-2">
      <Text className="text-lg font-semibold text-typography-900">Done</Text>
      {done.length === 0 ? (
        <Text className="pb-4 text-sm text-typography-500">Completed tasks will land here.</Text>
      ) : (
        <VStack className="gap-2 pb-4 pt-2">
          {done.map((task) => (
            <DoneRow key={task.id} task={task} />
          ))}
        </VStack>
      )}
      <Text className="text-lg font-semibold text-typography-900">To do</Text>
    </VStack>
  );
}

// Scrollable backlog overview: active tasks newest first (FR30), completed
// tasks in the Done section above (most recently finished first — updatedAt
// desc; there is deliberately no completedAt column). Cut-loose tasks appear
// in NEITHER section — the recycle bin arrives in Epic 7.
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
  const todo = tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
  const done = tasks
    .filter((task) => task.status === 'completed')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <FlatList
      data={todo}
      keyExtractor={(task) => task.id}
      renderItem={({ item }) => <TaskRow task={item} onPress={() => onTaskPress(item)} />}
      ListHeaderComponent={<ListHeader done={done} />}
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
