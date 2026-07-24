import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  MICRO_TASK_SKIP_THRESHOLD,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { AppShell } from '@/components/app-shell/app-shell';
import { CardBackOverlay } from '@/components/card-stack/card-back-overlay';
import { CardStack } from '@/components/card-stack/card-stack';
import { MicroTaskNudge } from '@/components/card-stack/micro-task-nudge';
import { ConnectionStatus } from '@/components/connection-status/connection-status';
import { EmptyState } from '@/components/empty-state/empty-state';
import { emptyStackCopy } from '@/components/empty-state/empty-stack-copy';
import { showRewardToast } from '@/components/feedback/reward-toast';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { ContextToggleBar } from '@/components/stack-filters/context-toggle-bar';
import { ModeToggle } from '@/components/stack-filters/mode-toggle';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useAbsenceCheck } from '@/hooks/use-absence-check';
import { useMicroTask } from '@/hooks/use-micro-task';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { availableContexts, curateTasks, urgentContexts } from '@/services/curation';
import { awardCutLooseStars } from '@/services/star-awards';
import { potentialStars } from '@/services/star-calculator';
import { recordTaskSkipped } from '@/services/task-activity';
import {
  applyTaskPatch,
  confirmReviewItem,
  cutLooseTask,
  keepTask,
  startTask,
} from '@/services/task-edits';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { promoteQuickWin } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';
import { useQuickAddStore } from '@/stores/quick-add-store';
import { useReviewModeStore } from '@/stores/review-mode-store';
import { useStackFiltersStore } from '@/stores/stack-filters-store';

export default function HomeScreen() {
  const router = useRouter();
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const toast = useToast();
  const tasks = useTasks();
  const starTotals = useStarTotals();

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
  const clearFilters = useStackFiltersStore((state) => state.clearFilters);

  // Session curation seed — stable across re-renders/live-query emits (the
  // order can't shuffle under the user's fingers mid-browse), fresh per app
  // session. `now` is taken at recompute time (urgency granularity is days).
  const [seed] = useState(() => Date.now() % 2 ** 31);

  // Absence tracking (Story 7.3): long enough away → welcome-back screen +
  // one-shot quick-win promotion of the deck below.
  useAbsenceCheck();
  const welcomeBackPending = useAppStore((state) => state.welcomeBackPending);
  const setWelcomeBackPending = useAppStore((state) => state.setWelcomeBackPending);

  const curated = useMemo(() => {
    const base = curateTasks(
      tasks,
      { contexts: activeContexts, size: mode },
      { now: new Date(), seed },
    );
    // AC4: after a welcome-back return the top card is an achievable quick
    // win. Post-processing keeps 3.3's algorithm untouched.
    return welcomeBackPending ? promoteQuickWin(base, new Date()) : base;
  }, [tasks, activeContexts, mode, seed, welcomeBackPending]);

  // The promotion is one-shot: clear the flag once the promoted stack has
  // actually been SHOWN (focused render with cards) — not while this screen
  // sits beneath the welcome-back/triage routes, where curated is already
  // non-empty but invisible.
  useFocusEffect(
    useCallback(() => {
      if (welcomeBackPending && curated.length > 0) {
        setWelcomeBackPending(false);
      }
    }, [welcomeBackPending, curated.length, setWelcomeBackPending]),
  );

  // Review mode (Story 6.2): UNFILTERED flagged cards — the review pass must
  // cover every AI guess, whatever context/mode filters happen to be active.
  const isReviewing = useReviewModeStore((state) => state.isReviewing);
  const enterReview = useReviewModeStore((state) => state.enter);
  const exitReview = useReviewModeStore((state) => state.exit);
  const reviewCards = useMemo(
    () => curateTasks(tasks, {}, { now: new Date(), seed }).filter((task) => task.hasCheckNeeded),
    [tasks, seed],
  );
  const handleReviewPress = () => {
    enterReview();
    track('review_mode_entered', { card_count: reviewCards.length });
  };

  // Micro-task nudge (Story 6.4, FR39): the stack reports its top card; the
  // quiet chip appears under it once that PENDING task has been skipped past
  // the threshold. Never in review mode (its stack is a different cycle).
  const [topTaskId, setTopTaskId] = useState<string | null>(null);
  const handleTopChange = useCallback((task: TaskData) => setTopTaskId(task.id), []);
  const topTask = useMemo(() => {
    const tracked = topTaskId ? curated.find((task) => task.id === topTaskId) : undefined;
    return tracked ?? curated[0] ?? null;
  }, [curated, topTaskId]);
  const micro = useMicroTask(topTask);
  const showNudge =
    !isReviewing &&
    topTask !== null &&
    topTask.status === 'pending' &&
    topTask.skipCount >= MICRO_TASK_SKIP_THRESHOLD;
  const available = useMemo(() => availableContexts(tasks, mode), [tasks, mode]);
  const urgent = useMemo(() => urgentContexts(tasks, new Date()), [tasks]);

  // Star preview closes over the UNFILTERED browsable list — relative
  // urgency ranks against ALL active tasks (matches 4.1's award input),
  // not just the filtered stack.
  const getStarValue = useMemo(() => {
    const browsable = tasks.filter(
      (task) => task.status === 'pending' || task.status === 'in_progress',
    );
    const now = new Date();
    return (task: TaskData) => potentialStars(task, browsable, now);
  }, [tasks]);

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
      // FAB → brain dump (Story 6.1, UX-DR15); quick add stays reachable via
      // the sheet on this screen ("Add one task instead" on the dump screen).
      onAddPress={openTask ? undefined : () => router.push('/brain-dump')}
      // Inert while the overlay is open (same as the FAB) — pushing a route
      // would leave the overlay's BackHandler swallowing hardware back.
      onListPress={openTask ? undefined : () => router.push('/task-list')}
      starTotals={starTotals}
      // Same inert-while-overlay guard as the list icon (4.3 AC5).
      onStarPress={openTask ? undefined : () => router.push('/star-log')}
      onSettingsPress={openTask ? undefined : () => router.push('/settings')}
    >
      {/* Shared filter chrome stays visible in every home state — the user
          must always be able to un-filter. The CardBackOverlay paints over
          it. Tight gap so the stack loses minimal height. */}
      <VStack className="gap-1">
        {/* Fixed-height slot: the reachability dot can flip states without
            ever shifting the card stack below (Story 5.1 AC-5). */}
        <HStack className="h-4 items-center justify-end px-1">
          <ConnectionStatus />
        </HStack>
        <ContextToggleBar
          activeContexts={activeContexts}
          availableContexts={available}
          urgentContexts={urgent}
          onToggle={handleToggleContext}
        />
        <ModeToggle mode={mode} onToggle={handleToggleMode} />
      </VStack>
      {isReviewing ? (
        // Review mode (Story 6.2): flagged cards only, banner above the stack.
        reviewCards.length === 0 ? (
          <EmptyState
            title="Nothing left to review"
            body="Every AI guess has been checked."
            actionLabel="Exit review"
            onAction={exitReview}
          />
        ) : (
          <>
            <HStack className="items-center justify-between px-2 pt-1">
              <Text className="text-sm font-medium text-typography-700">
                {`Reviewing ${reviewCards.length} ${reviewCards.length === 1 ? 'task' : 'tasks'}`}
              </Text>
              <Button size="sm" variant="outline" aria-label="Exit review" onPress={exitReview}>
                <ButtonText>Exit review</ButtonText>
              </Button>
            </HStack>
            <CardStack
              tasks={reviewCards}
              getStarValue={getStarValue}
              onCardPress={(task) => setOpenTaskId(task.id)}
              onReviewPress={handleReviewPress}
            />
          </>
        )
      ) : tasks.length === 0 ? (
        // New-user empty state (AC2). Epic 6 swaps this CTA to brain dump.
        <EmptyState
          title="No tasks yet"
          body="Get things out of your head — add your first task."
          actionLabel="Add a task"
          onAction={openTask ? undefined : open}
        />
      ) : curated.length === 0 ? (
        activeContexts.length > 0 || mode !== null ? (
          // Filters match nothing (AC1) — never show "no tasks" copy here,
          // tasks exist but fail the filter (1.3 AC8 guard).
          <EmptyState
            {...emptyStackCopy(activeContexts, mode)}
            actionLabel="Show all tasks"
            onAction={() => {
              clearFilters();
              track('stack_filters_cleared', { via: 'empty_state' });
            }}
          />
        ) : (
          // Everything completed/cut loose (AC3) — achievement framing.
          <EmptyState
            title="All clear"
            body="Nothing waiting right now. Add a task or check your list."
            actionLabel="Add a task"
            onAction={openTask ? undefined : open}
          />
        )
      ) : (
        <>
          <CardStack
            tasks={curated}
            getStarValue={getStarValue}
            onCardPress={(task) => setOpenTaskId(task.id)}
            onReviewPress={handleReviewPress}
            onSwipe={recordTaskSkipped}
            onTopChange={handleTopChange}
          />
          {showNudge ? (
            <MicroTaskNudge
              state={micro.state}
              step={micro.step}
              onRequest={micro.request}
              onAdd={micro.accept}
              onDismiss={micro.dismiss}
              onRetry={micro.retry}
            />
          ) : null}
        </>
      )}
      {openTask ? (
        <CardBackOverlay
          task={openTask}
          onPatch={(patch) => applyTaskPatch(openTask, patch)}
          onConfirm={(item) => confirmReviewItem(openTask, item)}
          onKeep={() => keepTask(openTask)}
          onDismiss={() => setOpenTaskId(null)}
          onStart={() => {
            startTask(openTask, 'card_back_overlay');
            // Unmount the overlay BEFORE pushing — its BackHandler stays live
            // under a pushed route and would swallow hardware back there.
            setOpenTaskId(null);
            router.push(`/task-running/${openTask.id}`);
          }}
          onHelp={() => {
            // Same start + unmount-then-push contract as Start; the param
            // auto-fires the first_steps request on arrival (Story 6.3, AC6).
            startTask(openTask, 'card_back_overlay');
            setOpenTaskId(null);
            router.push(`/task-running/${openTask.id}?breakdown=1`);
          }}
          onCutLoose={() => {
            // Idempotency ref (per task id): the unmount below stops later
            // taps, but a same-frame double tap reuses this closure and the
            // stale `openTask.status` defeats the service's status gate.
            if (cutLooseFiredRef.current === openTask.id) return;
            cutLooseFiredRef.current = openTask.id;
            cutLooseTask(openTask, 'card_back_overlay');
            // Unmount-then-toast — no route push, so no BackHandler landmine;
            // the stack simply advances to the next curated card. The toast
            // shows the persisted award amount (Story 4.1).
            setOpenTaskId(null);
            void awardCutLooseStars(db, openTask).then((stars) => {
              showRewardToast(toast, { title: 'Released', stars });
            });
          }}
        />
      ) : null}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
