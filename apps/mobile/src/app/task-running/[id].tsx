import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import { showRewardToast, showUndoToast } from '@/components/feedback/reward-toast';
import { TaskRunningScreen } from '@/components/task-running/task-running-screen';
import type { TaskRunningViewHandle } from '@/components/task-running/task-running-view';
import { useToast } from '@/components/ui/toast';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useStepActions } from '@/hooks/use-step-actions';
import { useSubtasks } from '@/hooks/use-subtasks';
import { useTasks } from '@/hooks/use-tasks';
import { db } from '@/lib/local-db';
import { awardCompletionStars, awardCutLooseStars } from '@/services/star-awards';
import { bankedForCount, taskValue } from '@/services/star-calculator';
import {
  addStep,
  removeSubtask,
  renameStep,
  reorderSteps,
  restoreStep,
  toggleSubtask,
} from '@/services/subtask-actions';
import { completeTask, createNotesAutosaver, cutLooseTask, startTask } from '@/services/task-edits';
import { undoTaskCompletion, undoTaskCutLoose } from '@/services/task-undo';

// Working screen (Story 2.1; renamed from "task running" 2026-07-27) —
// focused execution view. Since 2026-07-27 a card TAP lands here directly
// without starting the task: the pending → in_progress transition (and the
// Continue chip it drives) fires on the first MEANINGFUL action — notes,
// breakdown, subtasks — not on merely looking (see ensureStarted below).
// Data + behaviour for the working screen; everything visible is TaskRunningScreen.
export default function TaskRunningRoute() {
  const { id, breakdown: breakdownParam } = useLocalSearchParams<{
    id: string;
    breakdown?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const tasks = useTasks();
  const starTotals = useStarTotals();
  const task = tasks.find((candidate) => candidate.id === id) ?? null;

  const viewRef = useRef<TaskRunningViewHandle>(null);

  // AI step actions (D4): controller + live subtask list. The subtasks ride
  // into the moreSteps/change payloads so completed steps are never touched.
  const subtasks = useSubtasks(id);
  const stepActions = useStepActions(task, subtasks);

  // `?breakdown=1` (card-back "Help me with this") auto-fires Get more steps
  // once per mount — with zero steps that IS the first-steps ask (D4). The
  // param is only ever set on a fresh push, so no re-arm is needed. Waits
  // for the live query to deliver the task.
  const autoFiredRef = useRef(false);
  useEffect(() => {
    if (breakdownParam !== '1' || !task || autoFiredRef.current) return;
    autoFiredRef.current = true;
    // Requesting a breakdown is a meaningful action — start the task (the
    // card-back path already did; this covers any future ?breakdown=1 pushes).
    if (task.status === 'pending') startTask(task, 'task_running');
    stepActions.getMoreSteps();
  }, [breakdownParam, task, stepActions]);

  // One saver per screen session (Story 2.2): debounced autosaves all funnel
  // through it so `task_edited` fires at most once per session, not per pause.
  const saveNotes = useMemo(() => createNotesAutosaver(id), [id]);

  // Altering the task from here COUNTS AS STARTING it (2026-07-27): notes,
  // AI step requests, and subtask interactions flip pending → in_progress
  // (idempotent — startTask self-gates), while just opening the screen never
  // does. This is what makes the card's Continue chip honest.
  const ensureStarted = () => {
    if (task && task.status === 'pending') startTask(task, 'task_running');
  };

  // The view gets a wrapped controller so every AI step request also counts
  // as starting the task (same rule as notes and subtask taps above).
  const viewStepActions = {
    ...stepActions,
    getMoreSteps: () => {
      ensureStarted();
      stepActions.getMoreSteps();
    },
    changeThese: (feedback: string) => {
      ensureStarted();
      stepActions.changeThese(feedback);
    },
  };

  // Blur is not guaranteed on unmount — flush the notes draft before the
  // route pops, whatever pops it (back button, hardware back, iOS swipe-back).
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      viewRef.current?.flush();
    });
  }, [navigation]);

  // Once-guard: a double tap on the back button must not pop twice.
  const closedRef = useRef(false);
  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    router.back();
  };

  // Once-guard shared by the terminal actions (Done and Cut Loose): the
  // `task.status` prop is stale until the live query re-emits, so the
  // service-level status gate alone can't stop a double tap here.
  const actedRef = useRef(false);
  const handleDone = () => {
    if (!task || actedRef.current) return;
    actedRef.current = true;
    completeTask(task);
    // Award AFTER completion is queued — a failed award never blocks the
    // completion (4.1 AC7). The toast shows the actual persisted amount and
    // renders from the provider root, so it survives the route pop below.
    // Its Undo (2026-07-27) re-reads status from the DB, so the stale `task`
    // snapshot here is safe to close over.
    void awardCompletionStars(db, task).then((breakdown) => {
      showRewardToast(toast, {
        title: 'One down!',
        stars: breakdown.total,
        // Running total AFTER the award (`+15 · 80 TOTAL`, spec §5) — the
        // pre-award total is whatever the live counter last showed.
        total: starTotals.total + breakdown.total,
        celebrate: true,
        onUndo: () => void undoTaskCompletion(db, task),
      });
    });
    close();
  };

  // If we were pushed from the list detail, the detail beneath self-pops on
  // focus (its not-browsable guard covers cut_loose) → user lands on the list.
  const handleCutLoose = () => {
    if (!task || actedRef.current) return;
    actedRef.current = true;
    cutLooseTask(task, 'task_running');
    void awardCutLooseStars(db, task).then((stars) => {
      showRewardToast(toast, {
        title: 'Released',
        stars,
        onUndo: () => void undoTaskCutLoose(db, task),
      });
    });
    close();
  };

  if (!task) {
    // Live query hasn't emitted yet (first render) — same loading story as
    // the task detail route.
    return null;
  }

  // The star bucket (v1.5 spec §5): the header states the WHOLE prize up
  // front, with the banked half beside it — steps pay out of the bucket, so
  // breaking a task down never inflates its worth.
  const prize = taskValue(task);
  const banked = bankedForCount(task, subtasks.filter((subtask) => subtask.completed).length);

  return (
    <TaskRunningScreen
      task={task}
      prize={prize}
      banked={banked}
      onBack={close}
      onEditPress={() => router.push(`/task/${task.id}?flat=1`)}
      viewRef={viewRef}
      onPatch={(patch) => {
        ensureStarted();
        saveNotes(patch.notes ?? null);
      }}
      onDone={handleDone}
      onCutLoose={handleCutLoose}
      subtasks={subtasks}
      onToggleSubtask={(subtask) => {
        ensureStarted();
        toggleSubtask(subtask);
      }}
      stepActions={viewStepActions}
      stepEdits={{
        rename: (subtask, title) => {
          ensureStarted();
          renameStep(subtask, title);
        },
        remove: (subtask) => {
          ensureStarted();
          removeSubtask(subtask);
          // Undo re-inserts the row verbatim (banked stars re-bank too).
          showUndoToast(toast, {
            title: 'Step removed',
            onUndo: () => restoreStep(subtask),
          });
        },
        add: (title) => {
          ensureStarted();
          addStep(task.id, title);
        },
        reorder: (orderedIds, from, to) => {
          ensureStarted();
          reorderSteps(task.id, orderedIds, from, to);
        },
      }}
    />
  );
}
