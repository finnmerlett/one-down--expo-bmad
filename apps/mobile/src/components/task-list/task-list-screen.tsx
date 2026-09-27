import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TaskData } from '@one-down/shared';

import { BulkActionBar } from '@/components/task-list/bulk-action-bar';
import { ConfirmDialog } from '@/components/task-list/confirm-dialog';
import { TaskListView, type TaskListMode } from '@/components/task-list/task-list-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { StarBadge } from '@/services/star-calculator';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

const TABS: { key: TaskListMode; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'bin', label: 'Recycle bin' },
];

export type TaskListDialog = 'archive' | 'delete' | null;

/**
 * The whole task-list screen as the user sees it — header, Active / Recycle
 * bin tabs, the list, the multi-select action bar and the confirm dialogs —
 * driven entirely by props. src/app/task-list.tsx supplies the data and
 * behaviour; the screen stories (and so the design canvas) supply fixtures.
 */
export function TaskListScreen({
  tasks,
  tab,
  onTabChange,
  selectedIds,
  onToggleSelect,
  onLongPressTask,
  onRestore,
  onUndoComplete,
  getStarValue,
  getBadge,
  onTaskPress,
  onAddPress,
  onBack,
  onArchive,
  onRestoreSelection,
  onDeletePress,
  onCancelSelection,
  dialog,
  onConfirmArchive,
  onConfirmDelete,
  onDismissDialog,
}: {
  tasks: TaskData[];
  tab: TaskListMode;
  onTabChange: (tab: TaskListMode) => void;
  /** `null` = not selecting. */
  selectedIds: ReadonlySet<string> | null;
  onToggleSelect: (task: TaskData) => void;
  onLongPressTask: (task: TaskData) => void;
  onRestore: (task: TaskData) => void;
  onUndoComplete: (task: TaskData) => void;
  getStarValue?: (task: TaskData) => number;
  getBadge?: (task: TaskData) => StarBadge | null;
  onTaskPress: (task: TaskData) => void;
  onAddPress: () => void;
  onBack: () => void;
  onArchive: () => void;
  onRestoreSelection: () => void;
  onDeletePress: () => void;
  onCancelSelection: () => void;
  dialog: TaskListDialog;
  onConfirmArchive: () => void;
  onConfirmDelete: () => void;
  onDismissDialog: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="font-heading text-2xl text-typography-900">Tasks</Text>
      </HStack>
      {/* Two-segment tab control (Story 7.1 → v1.5 frame 08: 36px pill track). */}
      <HStack className="mb-3 self-center rounded-full bg-[rgba(44,39,35,0.06)] p-[3px]">
        {TABS.map(({ key, label }) => {
          const selected = tab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Tab: ${label}`}
              accessibilityState={{ selected }}
              onPress={() => onTabChange(key)}
              className={`h-[30px] items-center justify-center rounded-full px-5 ${
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
      <TaskListView
        tasks={tasks}
        mode={tab}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onLongPressTask={onLongPressTask}
        onRestore={onRestore}
        onUndoComplete={onUndoComplete}
        getStarValue={getStarValue}
        getBadge={getBadge}
        onTaskPress={onTaskPress}
        onAddPress={onAddPress}
      />
      {selectedIds !== null ? (
        <BulkActionBar
          count={selectedIds.size}
          mode={tab}
          onArchive={onArchive}
          onRestore={onRestoreSelection}
          onDelete={onDeletePress}
          onCancel={onCancelSelection}
        />
      ) : null}
      <ConfirmDialog
        visible={dialog === 'archive'}
        title="Remove stars?"
        body="Archiving started or completed tasks removes the stars they earned. This can't be undone, even if you restore them later."
        confirmLabel="Archive anyway"
        cancelAccessibilityLabel="Cancel archive"
        onConfirm={onConfirmArchive}
        onCancel={onDismissDialog}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete permanently?"
        body="This can't be undone."
        confirmLabel="Delete forever"
        cancelAccessibilityLabel="Cancel delete"
        onConfirm={onConfirmDelete}
        onCancel={onDismissDialog}
      />
    </SafeAreaView>
  );
}
