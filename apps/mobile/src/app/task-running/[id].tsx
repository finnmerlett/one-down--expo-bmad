import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { showRewardToast } from '@/components/feedback/reward-toast';
import {
  TaskRunningView,
  type TaskRunningViewHandle,
} from '@/components/task-running/task-running-view';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, EditIcon, Icon, StarIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useBreakdown } from '@/hooks/use-breakdown';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useSubtasks } from '@/hooks/use-subtasks';
import { useTasks } from '@/hooks/use-tasks';
import { db } from '@/lib/local-db';
import { awardCompletionStars, awardCutLooseStars } from '@/services/star-awards';
import { bankedForCount, taskValue } from '@/services/star-calculator';
import { removeSubtask, toggleSubtask } from '@/services/subtask-actions';
import { completeTask, createNotesAutosaver, cutLooseTask, startTask } from '@/services/task-edits';
import { undoTaskCompletion, undoTaskCutLoose } from '@/services/task-undo';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Working screen (Story 2.1; renamed from "task running" 2026-07-27) —
// focused execution view. Since 2026-07-27 a card TAP lands here directly
// without starting the task: the pending → in_progress transition (and the
// Continue chip it drives) fires on the first MEANINGFUL action — notes,
// breakdown, subtasks — not on merely looking (see ensureStarted below).
export default function TaskRunningScreen() {
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

  // AI breakdown (Story 6.3): controller + live subtask list. The subtasks
  // ride into the refine payload (Story 6.4) so completed steps are kept.
  const subtasks = useSubtasks(id);
  const breakdown = useBreakdown(task, subtasks);

  // `?breakdown=1` (card-back "Help me with this") auto-fires the first_steps
  // request once per mount — the param is only ever set on a fresh push, so
  // no re-arm is needed. Waits for the live query to deliver the task.
  const autoFiredRef = useRef(false);
  useEffect(() => {
    if (breakdownParam !== '1' || !task || autoFiredRef.current) return;
    autoFiredRef.current = true;
    // Requesting a breakdown is a meaningful action — start the task (the
    // card-back path already did; this covers any future ?breakdown=1 pushes).
    if (task.status === 'pending') startTask(task, 'task_running');
    breakdown.request('first_steps', 'card_back');
  }, [breakdownParam, task, breakdown]);

  // One saver per screen session (Story 2.2): debounced autosaves all funnel
  // through it so `task_edited` fires at most once per session, not per pause.
  const saveNotes = useMemo(() => createNotesAutosaver(id), [id]);

  // Altering the task from here COUNTS AS STARTING it (2026-07-27): notes,
  // breakdown requests, and subtask interactions flip pending → in_progress
  // (idempotent — startTask self-gates), while just opening the screen never
  // does. This is what makes the card's Continue chip honest.
  const ensureStarted = () => {
    if (task && task.status === 'pending') startTask(task, 'task_running');
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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-1">
        <Pressable
          accessibilityRole="button"
          aria-label="Pause and go back"
          hitSlop={8}
          onPress={close}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Box className="flex-1" />
        <HStack
          accessible
          accessibilityLabel={`Worth ${prize} stars when done${banked > 0 ? `, ${banked} banked` : ''}`}
          className="items-center gap-[9px]"
        >
          <HStack className="h-8 items-center gap-1.5 rounded-full border border-tertiary-300 bg-tertiary-100 px-[13px]">
            <Text className="text-xs text-tertiary-500">★</Text>
            <Text className="font-mono text-[13px] leading-none text-tertiary-700">{prize}</Text>
            <Text className="font-body-semibold text-[12.5px] text-tertiary-700">when done</Text>
          </HStack>
          {banked > 0 ? (
            <HStack className="items-center gap-1">
              <Icon as={StarIcon} size="2xs" className="text-tertiary-500" />
              <Text className="font-mono text-[13px] leading-none text-tertiary-700">{banked}</Text>
              <Text className="font-body-semibold text-[12.5px] text-tertiary-700">banked</Text>
            </HStack>
          ) : null}
        </HStack>
        <Box className="flex-1" />
        {/* Edit entry (2026-07-27): full editing lives on the task detail —
            this screen is for DOING, so it only ever patches notes. */}
        <Pressable
          accessibilityRole="button"
          aria-label={`Edit task: ${task.title}`}
          hitSlop={8}
          onPress={() => router.push(`/task/${task.id}`)}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={EditIcon} size="lg" className="text-typography-700" />
        </Pressable>
      </HStack>
      <TaskRunningView
        ref={viewRef}
        task={task}
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
        onDeleteSubtask={removeSubtask}
        breakdown={breakdown}
        onHelp={() => {
          ensureStarted();
          breakdown.request('first_steps', 'task_running');
        }}
      />
    </SafeAreaView>
  );
}
