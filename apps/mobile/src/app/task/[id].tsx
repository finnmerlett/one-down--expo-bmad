import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { CardBack, type CardBackHandle } from '@/components/card-stack/card-back';
import { Box } from '@/components/ui/box';
import { useTasks } from '@/hooks/use-tasks';
import { applyTaskPatch, startTask } from '@/services/task-edits';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// Isolated full-screen card back, reached from the task list (Story 1.5 AC).
// Reuses CardBack directly — it is overlay-agnostic (1.4 design note).
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const tasks = useTasks();
  const task = tasks.find((candidate) => candidate.id === id) ?? null;

  const cardBackRef = useRef<CardBackHandle>(null);

  // Blur is not guaranteed on unmount — flush pending text edits before the
  // route pops, whatever pops it (back button, Android hardware back, iOS
  // swipe-back). beforeRemove fires synchronously pre-removal for all three;
  // applyTaskPatch is module-scoped, so the write survives the unmount.
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      cardBackRef.current?.flush();
    });
  }, [navigation]);

  // Once-guard: a double tap on the back button must not pop the list too.
  const closedRef = useRef(false);
  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    router.back();
  };

  // Once-per-focus guard: a double tap on Start must not push the running
  // screen twice (or emit task_started twice from the stale-status prop).
  // Re-arming on focus is what lets Continue work again after returning.
  // (Draft staleness while this route sits beneath the running screen is
  // handled inside CardBack — draft-or-stored values.)
  const startingRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      startingRef.current = false;
    }, []),
  );

  // Not-browsable self-pop (Story 2.3, AC7): this route stays mounted beneath
  // the running screen — if the task was completed (or cut loose, 2.4) up
  // there, popping back must not strand the user on a dead card back. Only
  // while FOCUSED: calling router.back() while not top-of-stack would pop the
  // running screen instead. useFocusEffect re-runs on focus AND on dep
  // change, covering both orderings of pop vs. live-query emit.
  const status = task?.status;
  useFocusEffect(
    useCallback(() => {
      if (status && status !== 'pending' && status !== 'in_progress') close();
      // close is ref-guarded and recreated per render — deliberately not a dep.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [status]),
  );

  if (!task) {
    // Live query hasn't emitted yet (first render). Tasks can't be deleted
    // until Epic 7 and no deep links are exposed yet, so a missing id is
    // loading in practice.
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-50">
      <Box className="flex-1 p-3">
        <CardBack
          ref={cardBackRef}
          task={task}
          onPatch={(patch) => applyTaskPatch(task.id, patch)}
          onClose={close}
          onStart={() => {
            if (startingRef.current) return;
            startingRef.current = true;
            startTask(task, 'list_detail');
            router.push(`/task-running/${task.id}`);
          }}
          backLabel="Back to task list"
        />
      </Box>
    </SafeAreaView>
  );
}
