import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { CardBackOverlay } from '@/components/card-stack/card-back-overlay';
import { CardStack } from '@/components/card-stack/card-stack';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { curateTasks } from '@/services/curation';
import { applyTaskPatch, startTask } from '@/services/task-edits';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

export default function HomeScreen() {
  const router = useRouter();
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const tasks = useTasks();

  // Card-back state lives HERE, not in the stack — stack cards remount on
  // depth promotion, which would wipe any card-local flip state. The open
  // task re-resolves from the live query so the back always shows fresh data.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = openTaskId ? (tasks.find((task) => task.id === openTaskId) ?? null) : null;

  // Context filtering arrives with the ContextToggleBar (Story 3.x) — until
  // then every pending task is browsable.
  const curated = useMemo(() => curateTasks(tasks), [tasks]);

  const handleSubmit = async (input: CreateTaskInput) => {
    const task = await createTask(db, input);
    track('task_created', { source: 'quick_add', has_details: task.details !== null });
  };

  return (
    <AppShell
      onAddPress={openTask ? undefined : open}
      // Inert while the overlay is open (same as the FAB) — pushing a route
      // would leave the overlay's BackHandler swallowing hardware back.
      onListPress={openTask ? undefined : () => router.push('/task-list')}
    >
      {tasks.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Your tasks will appear here</Text>
        </Box>
      ) : curated.length === 0 ? (
        // Tasks exist but none are browsable (unreachable until 2.3/2.4 add
        // completed/cut-loose — in_progress stays in the stack) — AC8: the
        // "no tasks" message must not show here.
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Nothing to browse right now</Text>
        </Box>
      ) : (
        <CardStack tasks={curated} onCardPress={(task) => setOpenTaskId(task.id)} />
      )}
      {openTask ? (
        <CardBackOverlay
          task={openTask}
          onPatch={(patch) => applyTaskPatch(openTask.id, patch)}
          onDismiss={() => setOpenTaskId(null)}
          onStart={() => {
            startTask(openTask, 'card_back_overlay');
            // Unmount the overlay BEFORE pushing — its BackHandler stays live
            // under a pushed route and would swallow hardware back there.
            setOpenTaskId(null);
            router.push(`/task-running/${openTask.id}`);
          }}
        />
      ) : null}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
