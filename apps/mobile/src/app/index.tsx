import { useFocusEffect, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  MICRO_TASK_SKIP_THRESHOLD,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { UpdateReadyBanner } from '@/components/app-shell/update-ready-banner';
import { ConnectionStatus } from '@/components/connection-status/connection-status';
import { showRewardToast } from '@/components/feedback/reward-toast';
import { HomeScreen } from '@/components/home/home-screen';
import { useToast } from '@/components/ui/toast';
import { useAbsenceCheck } from '@/hooks/use-absence-check';
import { useBankedStars } from '@/hooks/use-banked-stars';
import { useMicroTask } from '@/hooks/use-micro-task';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useTaskOffers } from '@/hooks/use-task-offers';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { getContextAutoOpen } from '@/services/context-auto-open';
import {
  assignBadges,
  attentionContexts,
  availableContexts,
  curateTasks,
} from '@/services/curation';
import { awardCutLooseStars } from '@/services/star-awards';
import { isTopOfDeck, potentialStars } from '@/services/star-calculator';
import { erodeOffer, maybeStartOffer } from '@/services/star-offers';
import { recordTaskSkipped } from '@/services/task-activity';
import { undoTaskCutLoose } from '@/services/task-undo';
import {
  applyTaskPatch,
  confirmReviewItem,
  confirmReviewItems,
  cutLooseTask,
  keepTask,
  startTask,
} from '@/services/task-edits';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { promoteQuickWin } from '@/services/welcome-back';
import { useAppStore } from '@/stores/app-store';
import { useContextBarStore } from '@/stores/context-bar-store';
import { useQuickAddStore } from '@/stores/quick-add-store';
import { useStackFiltersStore } from '@/stores/stack-filters-store';

// Data + behaviour for home; everything visible is HomeScreen.
export default function HomeRoute() {
  const router = useRouter();
  // 9.8 D5: the context-sheet scrim follows the live scheme.
  const { colorScheme: scheme } = useColorScheme();
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const toast = useToast();
  const tasks = useTasks();
  const starTotals = useStarTotals();
  const bankedStars = useBankedStars();
  const offers = useTaskOffers();

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
  const setMode = useStackFiltersStore((state) => state.setMode);
  const clearFilters = useStackFiltersStore((state) => state.clearFilters);

  // "Right now" sheet (v1.5 frame 01): expands in place over the scrimmed
  // deck; opens automatically the first time home mounts each app session.
  const barExpanded = useContextBarStore((state) => state.expanded);
  const expandBar = useContextBarStore((state) => state.expand);
  const collapseBar = useContextBarStore((state) => state.collapse);
  const autoOpenOnce = useContextBarStore((state) => state.autoOpenOnce);
  const consumeAutoOpen = useContextBarStore((state) => state.consumeAutoOpen);
  // Auto-open belongs to SESSION OPEN only: if the first live-query emit
  // (well inside the grace window) has tasks, expand; an empty deck at open
  // forfeits it for the session — the sheet must never pop up mid-session
  // when the first task lands (brand-new-user seeding would hit that).
  // 9.8 D4: gated on the "ask for your context" setting — off means the stack
  // shows straight away with the previous context.
  const mountedAtRef = useRef(Date.now());
  useEffect(() => {
    if (Date.now() - mountedAtRef.current > 4000) {
      consumeAutoOpen();
      return;
    }
    if (tasks.length === 0) return;
    let cancelled = false;
    void getContextAutoOpen(db).then((enabled) => {
      if (cancelled) return;
      if (enabled) autoOpenOnce();
      else consumeAutoOpen();
    });
    return () => {
      cancelled = true;
    };
  }, [tasks.length, autoOpenOnce, consumeAutoOpen]);

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

  // Check queue (v1.5 D6b): the blueprint Triage screen replaces Story 6.2's
  // review MODE — the count is UNFILTERED (every AI guess, whatever filters
  // are active), and both entries (card marker + dashed bottom button) route
  // to /check-queue.
  const reviewCards = useMemo(
    () => curateTasks(tasks, {}, { now: new Date(), seed }).filter((task) => task.hasCheckNeeded),
    [tasks, seed],
  );
  const handleReviewPress = () => {
    router.push('/check-queue');
  };

  // Micro-task nudge (Story 6.4, FR39): the stack reports its top card; the
  // quiet chip appears under it once that PENDING task has been skipped past
  // the threshold. Never in review mode (its stack is a different cycle).
  const [topTaskId, setTopTaskId] = useState<string | null>(null);
  const handleTopChange = useCallback((task: TaskData) => {
    setTopTaskId(task.id);
    // The deck bids for avoided/aged cards when they come round (Row E):
    // self-gated + coin-flipped inside; fire-and-forget like task edits.
    void maybeStartOffer(db, task);
  }, []);
  const topTask = useMemo(() => {
    const tracked = topTaskId ? curated.find((task) => task.id === topTaskId) : undefined;
    return tracked ?? curated[0] ?? null;
  }, [curated, topTaskId]);
  const micro = useMicroTask(topTask);
  // E9: tapping the nudge costs no decisions — fetch the smallest step, add
  // it, and open the working screen with it showing. The pending ref rides
  // through the request's proposal state.
  const nudgeGoRef = useRef(false);
  const handleNudgeGo = useCallback(() => {
    nudgeGoRef.current = true;
    micro.request();
  }, [micro]);
  useEffect(() => {
    if (!nudgeGoRef.current) return;
    if (micro.state === 'proposal' && topTask) {
      nudgeGoRef.current = false;
      micro.accept();
      router.push(`/task-running/${topTask.id}`);
    } else if (micro.state === 'error') {
      nudgeGoRef.current = false;
    }
  }, [micro, topTask, router]);
  const showNudge =
    topTask !== null &&
    topTask.status === 'pending' &&
    topTask.skipCount >= MICRO_TASK_SKIP_THRESHOLD;
  // 9.8 D3: the nudge is the 7.2 health prompt now — Keep it clears the skip
  // streak; Cut loose mirrors the overlay path (award + undo toast).
  const handleNudgeKeep = useCallback(() => {
    if (topTask) keepTask(topTask);
  }, [topTask]);
  const handleNudgeCutLoose = useCallback(() => {
    const task = topTask;
    if (!task) return;
    if (cutLooseFiredRef.current === task.id) return;
    cutLooseFiredRef.current = task.id;
    cutLooseTask(task, 'home_nudge');
    void awardCutLooseStars(db, task).then((stars) => {
      showRewardToast(toast, {
        title: 'Released',
        stars,
        onUndo: () => {
          cutLooseFiredRef.current = null;
          void undoTaskCutLoose(db, task);
        },
      });
    });
  }, [topTask, toast]);
  // 9.8 G12: chips grey only when NO task at all needs that context — the
  // current mode must not grey them (it filters the stack, not the choices).
  const available = useMemo(() => availableContexts(tasks), [tasks]);

  // v1.5 economy: the card shows its size value; badges render separately
  // (gold band) and never fold into the number (spec §2).
  const getStarValue = useCallback((task: TaskData) => potentialStars(task), []);
  // Global assignment (9-5 item 16): urgency-ranked window badges + the live
  // offer, hard-capped at MAX_LIVE_BONUSES across the whole deck.
  const badges = useMemo(() => assignBadges(tasks, offers, new Date()), [tasks, offers]);
  const getBadge = useCallback((task: TaskData) => badges.get(task.id) ?? null, [badges]);
  const getTopOfDeck = useCallback(
    (task: TaskData) => getBadge(task) === null && isTopOfDeck(task, new Date()),
    [getBadge],
  );
  const attention = useMemo(
    () => attentionContexts(tasks, offers, new Date(), activeContexts),
    [tasks, offers, activeContexts],
  );

  // Committed pass: count the skip (6.4) and erode any live offer (Row E).
  const handleSwipe = useCallback((task: TaskData) => {
    recordTaskSkipped(task);
    void erodeOffer(db, task.id, task);
  }, []);

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

  const handleSetMode = (next: TaskSize | null) => {
    if (next === mode) return;
    setMode(next);
    track('mode_toggled', { mode: next ?? 'all', now_active: next !== null });
  };

  return (
    <HomeScreen
      starTotals={starTotals}
      bankedStars={bankedStars}
      onListPress={() => router.push('/task-list')}
      onStarPress={() => router.push('/star-log')}
      onSettingsPress={() => router.push('/settings')}
      banner={<UpdateReadyBanner />}
      connectionStatus={<ConnectionStatus />}
      activeContexts={activeContexts}
      attentionContexts={attention}
      availableContexts={available}
      mode={mode}
      onToggleContext={handleToggleContext}
      onSetMode={handleSetMode}
      onClearFilters={() => {
        clearFilters();
        track('stack_filters_cleared', { via: 'empty_state' });
      }}
      contextSheetOpen={barExpanded}
      onExpandContextSheet={expandBar}
      onCollapseContextSheet={collapseBar}
      scheme={scheme === 'dark' ? 'dark' : 'light'}
      hasTasks={tasks.length > 0}
      curated={curated}
      getStarValue={getStarValue}
      getBadge={getBadge}
      getTopOfDeck={getTopOfDeck}
      // Tap = go DO it (2026-07-27): straight to the working screen,
      // without starting the task — the working screen flips status on
      // the first meaningful action. Editing moved to the pencil.
      onCardPress={(task) => router.push(`/task-running/${task.id}`)}
      onEditPress={(task) => setOpenTaskId(task.id)}
      onReviewPress={handleReviewPress}
      onSwipe={handleSwipe}
      onTopChange={handleTopChange}
      nudge={{
        visible: showNudge,
        state: micro.state,
        onGo: handleNudgeGo,
        onRetry: handleNudgeGo,
        onKeep: handleNudgeKeep,
        onCutLoose: handleNudgeCutLoose,
      }}
      onAddPress={open}
      onBrainDumpPress={() => router.push('/brain-dump')}
      triageCount={reviewCards.length}
      onTriagePress={() => {
        collapseBar();
        handleReviewPress();
      }}
      cardBack={
        openTask
          ? {
              task: openTask,
              onPatch: (patch) => applyTaskPatch(openTask, patch),
              onConfirm: (item) => confirmReviewItem(openTask, item),
              onConfirmAll: (items) => confirmReviewItems(openTask, items),
              onKeep: () => keepTask(openTask),
              onDismiss: () => setOpenTaskId(null),
              onStart: () => {
                startTask(openTask, 'card_back_overlay');
                // Unmount the overlay BEFORE pushing — its BackHandler stays live
                // under a pushed route and would swallow hardware back there.
                setOpenTaskId(null);
                router.push(`/task-running/${openTask.id}`);
              },
              onCutLoose: () => {
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
                  showRewardToast(toast, {
                    title: 'Released',
                    stars,
                    onUndo: () => {
                      // Re-arm the idempotency ref — an undone task must be
                      // cut-loosable again later.
                      cutLooseFiredRef.current = null;
                      void undoTaskCutLoose(db, openTask);
                    },
                  });
                });
              },
            }
          : null
      }
      quickAdd={{ isOpen, onClose: close, onSubmit: handleSubmit }}
    />
  );
}
