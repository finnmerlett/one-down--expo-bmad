import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { showRewardToast } from '@/components/feedback/reward-toast';
import {
  TaskRunningView,
  type TaskRunningViewHandle,
} from '@/components/task-running/task-running-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useToast } from '@/components/ui/toast';
import { useBreakdown } from '@/hooks/use-breakdown';
import { useSubtasks } from '@/hooks/use-subtasks';
import { useTasks } from '@/hooks/use-tasks';
import { db } from '@/lib/local-db';
import { awardCompletionStars, awardCutLooseStars } from '@/services/star-awards';
import { removeSubtask, toggleSubtask } from '@/services/subtask-actions';
import { completeTask, createNotesAutosaver, cutLooseTask } from '@/services/task-edits';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Task running screen (Story 2.1) — focused execution view, pushed from a
// card back's Start/Continue. Leaving keeps the task in_progress (UX flow 4:
// "task stays in progress, shows Continue").
export default function TaskRunningScreen() {
  const { id, breakdown: breakdownParam } = useLocalSearchParams<{
    id: string;
    breakdown?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const tasks = useTasks();
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
    breakdown.request('first_steps', 'card_back');
  }, [breakdownParam, task, breakdown]);

  // One saver per screen session (Story 2.2): debounced autosaves all funnel
  // through it so `task_edited` fires at most once per session, not per pause.
  const saveNotes = useMemo(() => createNotesAutosaver(id), [id]);

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
    void awardCompletionStars(db, task).then((breakdown) => {
      showRewardToast(toast, { title: 'One down!', stars: breakdown.total });
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
      showRewardToast(toast, { title: 'Released', stars });
    });
    close();
  };

  if (!task) {
    // Live query hasn't emitted yet (first render) — same loading story as
    // the task detail route.
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Pause and go back"
          hitSlop={8}
          onPress={close}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
      </HStack>
      {/* The running view only ever patches notes. */}
      <TaskRunningView
        ref={viewRef}
        task={task}
        onPatch={(patch) => saveNotes(patch.notes ?? null)}
        onDone={handleDone}
        onCutLoose={handleCutLoose}
        subtasks={subtasks}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={removeSubtask}
        breakdown={breakdown}
        onHelp={() => breakdown.request('first_steps', 'task_running')}
      />
    </SafeAreaView>
  );
}
