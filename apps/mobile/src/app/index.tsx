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
import {
  createTask,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskPatch,
} from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

export default function HomeScreen() {
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

  // Inline auto-save: fire-and-forget against local SQLite (instantaneous,
  // no network — AC). CardBack only emits patches that change a value.
  const handleEdit = (patch: UpdateTaskPatch) => {
    if (!openTask) return;
    void updateTask(db, openTask.id, patch)
      .then(() => {
        for (const field of Object.keys(patch) as (keyof UpdateTaskPatch)[]) {
          track('task_edited', { field });
        }
      })
      .catch((error: unknown) => console.warn('Inline task update failed', error));
  };

  return (
    <AppShell onAddPress={openTask ? undefined : open}>
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
        <CardStack tasks={curated} onCardPress={(task) => setOpenTaskId(task.id)} />
      )}
      {openTask ? (
        <CardBackOverlay
          task={openTask}
          onPatch={handleEdit}
          onDismiss={() => setOpenTaskId(null)}
        />
      ) : null}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
