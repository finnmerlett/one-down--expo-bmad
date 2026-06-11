import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { CardBack, type CardBackHandle } from '@/components/card-stack/card-back';
import { Box } from '@/components/ui/box';
import { useTasks } from '@/hooks/use-tasks';
import { applyTaskPatch } from '@/services/task-edits';

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
          backLabel="Back to task list"
        />
      </Box>
    </SafeAreaView>
  );
}
