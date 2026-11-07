import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { TaskData } from '@one-down/shared';

import { showNoticeToast } from '@/components/feedback/notice-toast';
import { TaskListScreen, type TaskListDialog } from '@/components/task-list/task-list-screen';
import type { TaskListMode } from '@/components/task-list/task-list-view';
import { useToast } from '@/components/ui/toast';
import { useTasks } from '@/hooks/use-tasks';
import { useTaskOffers } from '@/hooks/use-task-offers';
import { db } from '@/lib/local-db';
import { assignBadges } from '@/services/curation';
import { netStarsByTask } from '@/services/star-awards';
import { taskValue } from '@/services/star-calculator';
import {
  archiveSelection,
  deleteSelection,
  needsArchiveWarning,
  restoreFromBin,
} from '@/services/task-archive';
import { undoTaskCompletion } from '@/services/task-undo';
import { useQuickAddStore } from '@/stores/quick-add-store';

function pluralTasks(count: number): string {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`;
}

// Data + behaviour for the task list; everything visible is TaskListScreen.
export default function TaskListRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const tasks = useTasks();
  const offers = useTaskOffers();
  // Global assignment (9-5 item 16): rows show exactly the badges the deck
  // shows — urgency-ranked, capped at MAX_LIVE_BONUSES.
  const badges = useMemo(() => assignBadges(tasks, offers, new Date()), [tasks, offers]);

  // Tab + multi-select state live HERE (component state, no router tabs) —
  // Story 7.1. `selectedIds === null` means not selecting.
  const [tab, setTab] = useState<TaskListMode>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [dialog, setDialog] = useState<TaskListDialog>(null);
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
    <TaskListScreen
      tasks={tasks}
      tab={tab}
      onTabChange={(next) => {
        setTab(next);
        exitSelection();
      }}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      onLongPressTask={enterSelection}
      onRestore={handleRestore}
      onUndoComplete={handleUndoComplete}
      getStarValue={taskValue}
      getBadge={(task) => badges.get(task.id) ?? null}
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
      onBack={() => router.back()}
      onArchive={handleArchivePress}
      onRestoreSelection={handleRestoreSelection}
      onDeletePress={() => setDialog('delete')}
      onCancelSelection={exitSelection}
      dialog={dialog}
      onConfirmArchive={() => runArchive(selectedTasks(), true)}
      onConfirmDelete={handleDeleteConfirm}
      onDismissDialog={() => setDialog(null)}
    />
  );
}
