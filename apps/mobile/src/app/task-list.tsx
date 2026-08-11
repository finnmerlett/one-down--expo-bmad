import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import type { TaskData } from '@one-down/shared';

import { showNoticeToast } from '@/components/feedback/notice-toast';
import { BulkActionBar } from '@/components/task-list/bulk-action-bar';
import { ConfirmDialog } from '@/components/task-list/confirm-dialog';
import { TaskListView, type TaskListMode } from '@/components/task-list/task-list-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useTasks } from '@/hooks/use-tasks';
import { useTaskOffers } from '@/hooks/use-task-offers';
import { db } from '@/lib/local-db';
import { netStarsByTask } from '@/services/star-awards';
import { liveBadge, taskValue } from '@/services/star-calculator';
import {
  archiveSelection,
  deleteSelection,
  needsArchiveWarning,
  restoreFromBin,
} from '@/services/task-archive';
import { undoTaskCompletion } from '@/services/task-undo';
import { useQuickAddStore } from '@/stores/quick-add-store';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

const TABS: { key: TaskListMode; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'bin', label: 'Recycle bin' },
];

function pluralTasks(count: number): string {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`;
}

export default function TaskListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const tasks = useTasks();
  const offers = useTaskOffers();

  // Tab + multi-select state live HERE (component state, no router tabs) —
  // Story 7.1. `selectedIds === null` means not selecting.
  const [tab, setTab] = useState<TaskListMode>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [dialog, setDialog] = useState<'archive' | 'delete' | null>(null);
  const selecting = selectedIds !== null;

  // Hardware/gesture back exits multi-select BEFORE popping the screen (AC8)
  // — the 1.5 beforeRemove pattern, ref-read so the listener subscribes once.
  const selectingRef = useRef(selecting);
  selectingRef.current = selecting;
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (!selectingRef.current) return;
      event.preventDefault();
      setSelectedIds(null);
      setDialog(null);
    });
  }, [navigation]);

  const enterSelection = (task: TaskData) => {
    setSelectedIds((previous) => previous ?? new Set([task.id]));
  };

  const toggleSelect = (task: TaskData) => {
    setSelectedIds((previous) => {
      if (previous === null) return previous;
      const next = new Set(previous);
      if (next.has(task.id)) {
        next.delete(task.id);
      } else {
        next.add(task.id);
      }
      return next;
    });
  };

  const exitSelection = () => {
    setSelectedIds(null);
    setDialog(null);
  };

  const selectedTasks = () => tasks.filter((task) => selectedIds?.has(task.id) ?? false);

  // Once-guard: bulk writes are awaited (the toast needs the totals) — block
  // double taps while one runs. Dialog confirm shares the same guard.
  const busyRef = useRef(false);
  const runGuarded = (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    void action()
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Bulk task action failed', error))
      .finally(() => {
        busyRef.current = false;
      });
  };

  const runArchive = (selected: TaskData[], warned: boolean) =>
    runGuarded(async () => {
      const { count, starsRemoved } = await archiveSelection(db, selected, { warned });
      setDialog(null);
      setSelectedIds(null);
      showNoticeToast(
        toast,
        starsRemoved > 0
          ? `Archived ${pluralTasks(count)} — ★${starsRemoved} removed`
          : `Archived ${pluralTasks(count)}`,
      );
    });

  // Archive tap: warn only when the selection would retract stars (AC2/AC3).
  const handleArchivePress = () =>
    runGuarded(async () => {
      const selected = selectedTasks();
      if (selected.length === 0) return;
      const net = await netStarsByTask(
        db,
        selected.map((task) => task.id),
      );
      if (needsArchiveWarning(selected, net)) {
        setDialog('archive');
        return;
      }
      const { count } = await archiveSelection(db, selected, { warned: false });
      setSelectedIds(null);
      showNoticeToast(toast, `Archived ${pluralTasks(count)}`);
    });

  const handleDeleteConfirm = () =>
    runGuarded(async () => {
      const ids = [...(selectedIds ?? [])];
      const count = await deleteSelection(db, ids);
      setDialog(null);
      setSelectedIds(null);
      showNoticeToast(toast, `Deleted ${pluralTasks(count)}`);
    });

  // Per-row undo on Done rows (2026-07-27): frictionless like restore —
  // it's reversible (just complete again), so no confirm; the toast carries
  // the star retraction so the cost is never silent (archive-toast wording).
  const handleUndoComplete = (task: TaskData) => {
    void undoTaskCompletion(db, task)
      .then(({ starsRemoved }) =>
        showNoticeToast(
          toast,
          starsRemoved > 0 ? `Marked as not done — ★${starsRemoved} removed` : 'Marked as not done',
        ),
      )
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Undo completion failed', error));
  };

  // Frictionless single restore (AC6 — no confirm, reversible-in-spirit).
  const handleRestore = (task: TaskData) => {
    void restoreFromBin(db, task)
      .then(() => showNoticeToast(toast, 'Restored'))
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Task restore failed', error));
  };

  const handleRestoreSelection = () =>
    runGuarded(async () => {
      for (const task of selectedTasks()) {
        await restoreFromBin(db, task);
      }
      setSelectedIds(null);
      showNoticeToast(toast, 'Restored');
    });

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={() => router.back()}
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
              onPress={() => {
                setTab(key);
                exitSelection();
              }}
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
        onToggleSelect={toggleSelect}
        onLongPressTask={enterSelection}
        onRestore={handleRestore}
        onUndoComplete={handleUndoComplete}
        getStarValue={taskValue}
        getBadge={(task) => liveBadge(task, offers.get(task.id), new Date())}
        // Viewing, not editing (2026-08-11 item 8): rows open the task's
        // working screen in its looking state — status only flips on the
        // first meaningful action. Editing lives behind the pencil there.
        onTaskPress={(task) => router.push(`/task-running/${task.id}`)}
        onAddPress={() => {
          // The quick-add sheet is mounted on the home screen — open it via
          // the global UI store, then pop back so it shows as home regains
          // focus (Story 3.4 AC4).
          useQuickAddStore.getState().open();
          router.back();
        }}
      />
      {selecting ? (
        <BulkActionBar
          count={selectedIds.size}
          mode={tab}
          onArchive={handleArchivePress}
          onRestore={handleRestoreSelection}
          onDelete={() => setDialog('delete')}
          onCancel={exitSelection}
        />
      ) : null}
      <ConfirmDialog
        visible={dialog === 'archive'}
        title="Remove stars?"
        body="Archiving started or completed tasks removes the stars they earned. This can't be undone, even if you restore them later."
        confirmLabel="Archive anyway"
        cancelAccessibilityLabel="Cancel archive"
        onConfirm={() => runArchive(selectedTasks(), true)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete permanently?"
        body="This can't be undone."
        confirmLabel="Delete forever"
        cancelAccessibilityLabel="Cancel delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}
