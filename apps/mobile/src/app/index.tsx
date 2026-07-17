import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { STAR_WEIGHTS, type TaskContext, type TaskSize } from '@one-down/shared';

import { AppShell } from '@/components/app-shell/app-shell';
import { CardBackOverlay } from '@/components/card-stack/card-back-overlay';
import { CardStack } from '@/components/card-stack/card-stack';
import { showRewardToast } from '@/components/feedback/reward-toast';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { ContextToggleBar } from '@/components/stack-filters/context-toggle-bar';
import { ModeToggle } from '@/components/stack-filters/mode-toggle';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { availableContexts, curateTasks } from '@/services/curation';
import { applyTaskPatch, cutLooseTask, startTask } from '@/services/task-edits';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';
import { useStackFiltersStore } from '@/stores/stack-filters-store';

export default function HomeScreen() {
  const router = useRouter();
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const toast = useToast();
  const tasks = useTasks();

  // Card-back state lives HERE, not in the stack — stack cards remount on
  // depth promotion, which would wipe any card-local flip state. The open
  // task re-resolves from the live query so the back always shows fresh data.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = openTaskId ? (tasks.find((task) => task.id === openTaskId) ?? null) : null;

  // Last task id cut loose from the overlay — see the onCutLoose guard below.
  const cutLooseFiredRef = useRef<string | null>(null);

  const activeContexts = useStackFiltersStore((state) => state.activeContexts);
  const toggleContext = useStackFiltersStore((state) => state.toggleContext);
  const mode = useStackFiltersStore((state) => state.mode);
  const toggleMode = useStackFiltersStore((state) => state.toggleMode);

  const curated = useMemo(
    () => curateTasks(tasks, { contexts: activeContexts, size: mode }),
    [tasks, activeContexts, mode],
  );
  const available = useMemo(() => availableContexts(tasks, mode), [tasks, mode]);

  const handleSubmit = async (input: CreateTaskInput) => {
    const task = await createTask(db, input);
    track('task_created', { source: 'quick_add', has_details: task.details !== null });
  };

  const handleToggleContext = (context: TaskContext) => {
    const nowActive = !activeContexts.includes(context);
    toggleContext(context);
    track('context_toggled', {
      context,
      now_active: nowActive,
      active_count: nowActive ? activeContexts.length + 1 : activeContexts.length - 1,
    });
  };

  const handleToggleMode = (size: TaskSize) => {
    const nowActive = mode !== size;
    toggleMode(size);
    track('mode_toggled', { mode: size, now_active: nowActive });
  };

  return (
    <AppShell
      onAddPress={openTask ? undefined : open}
      // Inert while the overlay is open (same as the FAB) — pushing a route
      // would leave the overlay's BackHandler swallowing hardware back.
      onListPress={openTask ? undefined : () => router.push('/task-list')}
    >
      {/* Shared filter chrome stays visible in every home state — the user
          must always be able to un-filter. The CardBackOverlay paints over
          it. Tight gap so the stack loses minimal height. */}
      <VStack className="gap-1">
        <ContextToggleBar
          activeContexts={activeContexts}
          availableContexts={available}
          onToggle={handleToggleContext}
        />
        <ModeToggle mode={mode} onToggle={handleToggleMode} />
      </VStack>
      {tasks.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Your tasks will appear here</Text>
        </Box>
      ) : curated.length === 0 ? (
        // Tasks exist but none are curated — everything is completed/cut
        // loose OR the active filters match nothing. The "no tasks" message
        // must not show here. (Full guidance treatment is Story 3.4.)
        <Box className="flex-1 items-center justify-center gap-1 px-8">
          <Text className="text-center text-typography-400">Nothing to browse right now</Text>
          <Text className="text-center text-typography-400">
            Try another context or add a task.
          </Text>
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
          onCutLoose={() => {
            // Idempotency ref (per task id): the unmount below stops later
            // taps, but a same-frame double tap reuses this closure and the
            // stale `openTask.status` defeats the service's status gate.
            if (cutLooseFiredRef.current === openTask.id) return;
            cutLooseFiredRef.current = openTask.id;
            cutLooseTask(openTask, 'card_back_overlay');
            // Unmount-then-toast — no route push, so no BackHandler landmine;
            // the stack simply advances to the next curated card.
            setOpenTaskId(null);
            showRewardToast(toast, { title: 'Released', stars: STAR_WEIGHTS.cutLoose });
          }}
        />
      ) : null}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
