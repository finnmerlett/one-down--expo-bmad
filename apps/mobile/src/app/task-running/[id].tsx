import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import {
  TaskRunningView,
  type TaskRunningViewHandle,
} from '@/components/task-running/task-running-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useTasks } from '@/hooks/use-tasks';
import { applyTaskPatch } from '@/services/task-edits';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Task running screen (Story 2.1) — focused execution view, pushed from a
// card back's Start/Continue. Leaving keeps the task in_progress (UX flow 4:
// "task stays in progress, shows Continue").
export default function TaskRunningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const tasks = useTasks();
  const task = tasks.find((candidate) => candidate.id === id) ?? null;

  const viewRef = useRef<TaskRunningViewHandle>(null);

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
      <TaskRunningView
        ref={viewRef}
        task={task}
        onPatch={(patch) => applyTaskPatch(task.id, patch)}
      />
    </SafeAreaView>
  );
}
