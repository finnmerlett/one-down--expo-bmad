import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { STAR_WEIGHTS } from '@one-down/shared';

import { RewardToast } from '@/components/feedback/reward-toast';
import {
  TaskRunningView,
  type TaskRunningViewHandle,
} from '@/components/task-running/task-running-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useToast } from '@/components/ui/toast';
import { useTasks } from '@/hooks/use-tasks';
import { completeTask, createNotesAutosaver } from '@/services/task-edits';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Task running screen (Story 2.1) — focused execution view, pushed from a
// card back's Start/Continue. Leaving keeps the task in_progress (UX flow 4:
// "task stays in progress, shows Continue").
export default function TaskRunningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const tasks = useTasks();
  const task = tasks.find((candidate) => candidate.id === id) ?? null;

  const viewRef = useRef<TaskRunningViewHandle>(null);

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

  // Once-guard shared by the terminal actions (Done now, Cut Loose in 2.4):
  // the `task.status` prop is stale until the live query re-emits, so the
  // service-level status gate alone can't stop a double tap here.
  const actedRef = useRef(false);
  const handleDone = () => {
    if (!task || actedRef.current) return;
    actedRef.current = true;
    completeTask(task);
    // Shown from the provider root — survives the route pop below.
    toast.show({
      placement: 'top',
      duration: 2000,
      render: ({ id: toastId }) => (
        <RewardToast
          nativeID={`toast-${toastId}`}
          title="One down!"
          stars={STAR_WEIGHTS.taskCompletion}
        />
      ),
    });
    close();
  };

  if (!task) {
    // Live query hasn't emitted yet (first render) — same loading story as
    // the task detail route.
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
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
      />
    </SafeAreaView>
  );
}
