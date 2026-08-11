import { BlurTargetView, BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, withTiming } from 'react-native-reanimated';

import {
  MICRO_TASK_SKIP_THRESHOLD,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { AppShell } from '@/components/app-shell/app-shell';
import { BottomActions } from '@/components/app-shell/bottom-actions';
import { CardBackOverlay } from '@/components/card-stack/card-back-overlay';
import { CardStack } from '@/components/card-stack/card-stack';
import { MicroTaskNudge } from '@/components/card-stack/micro-task-nudge';
import { UpdateReadyBanner } from '@/components/app-shell/update-ready-banner';
import { ConnectionStatus } from '@/components/connection-status/connection-status';
import { EmptyState } from '@/components/empty-state/empty-state';
import { emptyStackCopy } from '@/components/empty-state/empty-stack-copy';
import { showRewardToast } from '@/components/feedback/reward-toast';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { ContextBar } from '@/components/stack-filters/context-bar';
import { ContextSheet } from '@/components/stack-filters/context-sheet';
import { SizeSwitcher } from '@/components/stack-filters/size-switcher';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { useToast } from '@/components/ui/toast';
import { VStack } from '@/components/ui/vstack';
import { useAbsenceCheck } from '@/hooks/use-absence-check';
import { useBankedStars } from '@/hooks/use-banked-stars';
import { useMicroTask } from '@/hooks/use-micro-task';
import { useStarTotals } from '@/hooks/use-star-totals';
import { useTaskOffers } from '@/hooks/use-task-offers';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { attentionContexts, availableContexts, curateTasks } from '@/services/curation';
import { awardCutLooseStars } from '@/services/star-awards';
import { isTopOfDeck, liveBadge, potentialStars } from '@/services/star-calculator';
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

// Context-sheet morph (2026-08-11 item 1): grows down out of the bar's spot
// and shrinks back — replaces the old instant mount/unmount pop.
const sheetEnter = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: -14 }, { scale: 0.96 }] },
    animations: {
      opacity: withTiming(1, { duration: 200 }),
      transform: [
        { translateY: withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }) },
        { scale: withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }) },
      ],
    },
  };
};

const sheetExit = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 150 }),
      transform: [
        { translateY: withTiming(-14, { duration: 170, easing: Easing.in(Easing.cubic) }) },
        { scale: withTiming(0.96, { duration: 170, easing: Easing.in(Easing.cubic) }) },
      ],
    },
  };
};

export default function HomeScreen() {
  const router = useRouter();
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
  const mountedAtRef = useRef(Date.now());
  useEffect(() => {
    if (Date.now() - mountedAtRef.current > 4000) {
      consumeAutoOpen();
      return;
    }
    if (tasks.length > 0) autoOpenOnce();
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
  // What the context-sheet scrim blurs (expo-blur 56 needs an explicit
  // target): the home content BELOW the overlay — never the overlay itself.
  const blurTargetRef = useRef<View>(null);
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
  const available = useMemo(() => availableContexts(tasks, mode), [tasks, mode]);

  // v1.5 economy: the card shows its size value; badges render separately
  // (gold band) and never fold into the number (spec §2).
  const getStarValue = useCallback((task: TaskData) => potentialStars(task), []);
  const getBadge = useCallback(
    (task: TaskData) => liveBadge(task, offers.get(task.id), new Date()),
    [offers],
  );
  const getTopOfDeck = useCallback(
    (task: TaskData) => getBadge(task) === null && isTopOfDeck(task, new Date()),
    [getBadge],
  );
  const attention = useMemo(() => attentionContexts(tasks, offers, new Date()), [tasks, offers]);

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

  const overlayUp = openTask !== null;

  return (
    <AppShell
      onListPress={overlayUp ? undefined : () => router.push('/task-list')}
      starTotals={starTotals}
      bankedStars={bankedStars}
      // Inert while the card-back overlay is open — pushing a route would
      // leave the overlay's BackHandler swallowing hardware back (4.3 AC5).
      onStarPress={overlayUp ? undefined : () => router.push('/star-log')}
      onSettingsPress={overlayUp ? undefined : () => router.push('/settings')}
      // Standing actions (v1.5): plus = quick add, Brain dump pill; the
      // dashed triage entry joins while the Right-now sheet is expanded.
      footer={
        overlayUp ? undefined : (
          <BottomActions
            onAddPress={open}
            onBrainDumpPress={() => router.push('/brain-dump')}
            showTriage={barExpanded}
            triageCount={reviewCards.length}
            onTriagePress={() => {
              collapseBar();
              handleReviewPress();
            }}
          />
        )
      }
    >
      {/* Blur target wrapper: everything the expanded context sheet sits
          over. collapsable={false} keeps the native view alive for the
          snapshot; flex/column flow is identical to the bare children. */}
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        {/* OTA update prompt (2026-07-27) — appears only when a downloaded
          update is pending; one tap reloads into it (no double-restart). */}
        <UpdateReadyBanner />
        {/* Shared filter chrome stays visible in every home state — the user
          must always be able to un-filter. The CardBackOverlay paints over
          it. Tight gap so the stack loses minimal height. */}
        <VStack className="gap-1">
          {/* Fixed-height slot: the reachability dot can flip states without
            ever shifting the card stack below (Story 5.1 AC-5). */}
          <HStack className="h-4 items-center justify-end px-2">
            <ConnectionStatus />
          </HStack>
          <VStack className="px-[22px]">
            <ContextBar
              activeContexts={activeContexts}
              attentionContexts={attention}
              onExpand={expandBar}
            />
            <Box className="mt-[9px]">
              <SizeSwitcher mode={mode} onSetMode={handleSetMode} />
            </Box>
          </VStack>
        </VStack>
        {tasks.length === 0 ? (
          // New-user empty state (AC2). Epic 6 swaps this CTA to brain dump.
          <EmptyState
            title="No tasks yet"
            body="Get things out of your head — add your first task."
            actionLabel="Add a task"
            onAction={overlayUp ? undefined : open}
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
              onAction={overlayUp ? undefined : open}
            />
          )
        ) : (
          <>
            <CardStack
              tasks={curated}
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
            />
            {showNudge ? (
              <MicroTaskNudge state={micro.state} onGo={handleNudgeGo} onRetry={handleNudgeGo} />
            ) : null}
          </>
        )}
      </BlurTargetView>
      {/* Expanded "Right now" sheet (frame 01): scrim over the content, the
          sheet floating where the bar sits. The standing actions below stay
          live (they carry the triage entry in this state). */}
      {barExpanded && !overlayUp ? (
        <Box className="absolute inset-0">
          {/* Blurred scrim (2026-08-11 item 1): the deck genuinely blurs
              behind the sheet; the wash on top keeps the old tone. */}
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(150)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <BlurView
              intensity={22}
              tint="light"
              blurMethod="dimezisBlurView"
              blurTarget={blurTargetRef}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              aria-label="Close context sheet"
              onPress={collapseBar}
              className="absolute inset-0 bg-background-100/40"
            />
          </Animated.View>
          {/* The sheet grows out of the bar's spot instead of popping.
              Plain style — reanimated views are not css-interop registered. */}
          <Animated.View
            entering={sheetEnter}
            exiting={sheetExit}
            // Even expansion (item 1): the bar sits at 22dp side insets and
            // ~20dp from the overlay top; the sheet extends 8dp past it on
            // ALL sides — sides 22→14, top 20→12 — so the collapsed bar
            // overlays the expanded sheet with uniform padding.
            style={{ marginHorizontal: 14, marginTop: 12 }}
          >
            <ContextSheet
              activeContexts={activeContexts}
              availableContexts={available}
              attentionContexts={attention}
              mode={mode}
              onToggleContext={handleToggleContext}
              onSetMode={handleSetMode}
              onDone={collapseBar}
            />
          </Animated.View>
        </Box>
      ) : null}
      {openTask ? (
        <CardBackOverlay
          task={openTask}
          onPatch={(patch) => applyTaskPatch(openTask, patch)}
          onConfirm={(item) => confirmReviewItem(openTask, item)}
          onConfirmAll={(items) => confirmReviewItems(openTask, items)}
          onKeep={() => keepTask(openTask)}
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
          }}
        />
      ) : null}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
