import { useMemo } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { CardStack } from '@/components/card-stack/card-stack';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { curateTasks } from '@/services/curation';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

export default function HomeScreen() {
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const tasks = useTasks();

  // Context filtering arrives with the ContextToggleBar (Story 3.x) — until
  // then every pending task is browsable.
  const curated = useMemo(() => curateTasks(tasks), [tasks]);

  const handleSubmit = async (input: CreateTaskInput) => {
    const task = await createTask(db, input);
    track('task_created', { source: 'quick_add', has_details: task.details !== null });
  };

  return (
    <AppShell onAddPress={open}>
      {tasks.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Your tasks will appear here</Text>
        </Box>
      ) : curated.length === 0 ? (
        // Tasks exist but none are browsable (unreachable until Epic 2 adds
        // status changes) — AC8: the "no tasks" message must not show here.
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Nothing to browse right now</Text>
        </Box>
      ) : (
        <CardStack tasks={curated} />
      )}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
