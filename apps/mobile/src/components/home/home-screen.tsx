import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, withTiming } from 'react-native-reanimated';

import type { TaskContext, TaskData, TaskSize } from '@one-down/shared';

import { AppShell } from '@/components/app-shell/app-shell';
import { BottomActions } from '@/components/app-shell/bottom-actions';
import { CardBackOverlay } from '@/components/card-stack/card-back-overlay';
import { CardStack } from '@/components/card-stack/card-stack';
import { MicroTaskNudge, NudgeReveal } from '@/components/card-stack/micro-task-nudge';
import { EmptyState } from '@/components/empty-state/empty-state';
import { emptyStackCopy } from '@/components/empty-state/empty-stack-copy';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { ContextBar } from '@/components/stack-filters/context-bar';
import { ContextSheet } from '@/components/stack-filters/context-sheet';
import { SizeSwitcher } from '@/components/stack-filters/size-switcher';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';

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

type ShellProps = ComponentProps<typeof AppShell>;
type StackProps = ComponentProps<typeof CardStack>;
type NudgeProps = ComponentProps<typeof MicroTaskNudge>;

export interface HomeScreenProps {
  // Top bar
  starTotals: ShellProps['starTotals'];
  bankedStars: ShellProps['bankedStars'];
  onListPress: () => void;
  onStarPress: () => void;
  onSettingsPress: () => void;
  /** Self-connected slots (OTA banner, reachability dot) — the route fills them. */
  banner?: ReactNode;
  connectionStatus?: ReactNode;

  // Filters and the "Right now" sheet
  activeContexts: TaskContext[];
  attentionContexts: ComponentProps<typeof ContextBar>['attentionContexts'];
  availableContexts: ComponentProps<typeof ContextSheet>['availableContexts'];
  mode: TaskSize | null;
  onToggleContext: (context: TaskContext) => void;
  onSetMode: (mode: TaskSize | null) => void;
  onClearFilters: () => void;
  contextSheetOpen: boolean;
  onExpandContextSheet: () => void;
  onCollapseContextSheet: () => void;
  scheme: 'light' | 'dark';

  // The deck
  /** Whether any task exists at all (drives the new-user empty state). */
  hasTasks: boolean;
  curated: TaskData[];
  getStarValue: StackProps['getStarValue'];
  getBadge: StackProps['getBadge'];
  getTopOfDeck: StackProps['getTopOfDeck'];
  onCardPress: StackProps['onCardPress'];
  onEditPress: StackProps['onEditPress'];
  onReviewPress: StackProps['onReviewPress'];
  onSwipe: StackProps['onSwipe'];
  onTopChange: StackProps['onTopChange'];
  nudge: { visible: boolean } & NudgeProps;

  // Standing actions
  onAddPress: () => void;
  onBrainDumpPress: () => void;
  triageCount: number;
  onTriagePress: () => void;

  // Overlays
  /** The card back open over the deck, if any. */
  cardBack: ComponentProps<typeof CardBackOverlay> | null;
  quickAdd: ComponentProps<typeof QuickAddSheet>;
}

/**
 * The home screen as the user sees it — top bar, filters, the deck (or its
 * empty states), the nudge, standing actions and every overlay — driven
 * entirely by props. src/app/index.tsx computes the curation, stores and
 * side effects; the screen stories (and so the design canvas) pass fixtures.
 */
export function HomeScreen({
  starTotals,
  bankedStars,
  onListPress,
  onStarPress,
  onSettingsPress,
  banner,
  connectionStatus,
  activeContexts,
  attentionContexts,
  availableContexts,
  mode,
  onToggleContext,
  onSetMode,
  onClearFilters,
  contextSheetOpen,
  onExpandContextSheet,
  onCollapseContextSheet,
  scheme,
  hasTasks,
  curated,
  getStarValue,
  getBadge,
  getTopOfDeck,
  onCardPress,
  onEditPress,
  onReviewPress,
  onSwipe,
  onTopChange,
  nudge: { visible: nudgeVisible, ...nudge },
  onAddPress,
  onBrainDumpPress,
  triageCount,
  onTriagePress,
  cardBack,
  quickAdd,
}: HomeScreenProps) {
  // What the context-sheet scrim blurs (expo-blur 56 needs an explicit
  // target): the home content BELOW the overlay — never the overlay itself.
  const blurTargetRef = useRef<View>(null);
  const overlayUp = cardBack !== null;

  return (
    <AppShell
      onListPress={overlayUp ? undefined : onListPress}
      starTotals={starTotals}
      bankedStars={bankedStars}
      // Inert while the card-back overlay is open — pushing a route would
      // leave the overlay's BackHandler swallowing hardware back (4.3 AC5).
      onStarPress={overlayUp ? undefined : onStarPress}
      onSettingsPress={overlayUp ? undefined : onSettingsPress}
      // Standing actions (v1.5): plus = quick add, Brain dump pill; the
      // dashed triage entry stands whenever the check queue is non-empty
      // (9-5 item 6).
      footer={
        overlayUp ? undefined : (
          <BottomActions
            onAddPress={onAddPress}
            onBrainDumpPress={onBrainDumpPress}
            triageCount={triageCount}
            onTriagePress={onTriagePress}
          />
        )
      }
    >
      {/* Blur target wrapper: everything the expanded context sheet sits
          over. collapsable={false} keeps the native view alive for the
          snapshot; flex/column flow is identical to the bare children.
          While the card-back overlay is up, home content leaves the a11y
          tree (9.8 D3 made the nudge share the health prompt's labels —
          TalkBack/Maestro must never reach the copy behind the overlay). */}
      <BlurTargetView
        ref={blurTargetRef}
        style={{ flex: 1 }}
        importantForAccessibility={overlayUp ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={overlayUp}
      >
        {/* OTA update prompt (2026-07-27) — appears only when a downloaded
          update is pending; one tap reloads into it (no double-restart). */}
        {banner}
        {/* Shared filter chrome stays visible in every home state — the user
          must always be able to un-filter. The CardBackOverlay paints over
          it. Tight gap so the stack loses minimal height. */}
        <VStack className="gap-1">
          {/* Fixed-height slot: the reachability dot can flip states without
            ever shifting the card stack below (Story 5.1 AC-5). */}
          <HStack className="h-4 items-center justify-end px-2">{connectionStatus}</HStack>
          <VStack className="px-[22px]">
            <ContextBar
              activeContexts={activeContexts}
              attentionContexts={attentionContexts}
              onExpand={onExpandContextSheet}
            />
            <Box className="mt-[9px]">
              <SizeSwitcher mode={mode} onSetMode={onSetMode} />
            </Box>
          </VStack>
        </VStack>
        {!hasTasks ? (
          // New-user empty state (AC2). Epic 6 swaps this CTA to brain dump.
          <EmptyState
            title="No tasks yet"
            body="Get things out of your head — add your first task."
            actionLabel="Add a task"
            onAction={overlayUp ? undefined : onAddPress}
          />
        ) : curated.length === 0 ? (
          activeContexts.length > 0 || mode !== null ? (
            // Filters match nothing (AC1) — never show "no tasks" copy here,
            // tasks exist but fail the filter (1.3 AC8 guard).
            <EmptyState
              {...emptyStackCopy(activeContexts, mode)}
              actionLabel="Show all tasks"
              onAction={onClearFilters}
            />
          ) : (
            // Everything completed/cut loose (AC3) — achievement framing.
            <EmptyState
              title="All clear"
              body="Nothing waiting right now. Add a task or check your list."
              actionLabel="Add a task"
              onAction={overlayUp ? undefined : onAddPress}
            />
          )
        ) : (
          <>
            <CardStack
              tasks={curated}
              getStarValue={getStarValue}
              getBadge={getBadge}
              getTopOfDeck={getTopOfDeck}
              onCardPress={onCardPress}
              onEditPress={onEditPress}
              onReviewPress={onReviewPress}
              onSwipe={onSwipe}
              onTopChange={onTopChange}
            />
            {/* Height-reveal (9-5 item 5): the deck eases up/down instead of
                jumping when the nudge appears or the next card drops it.
                Collapsed while the card-back overlay is up: since D3 the
                nudge carries the health prompt's exact labels, and a
                still-rendered copy behind the overlay hijacks hierarchy
                matching (Maestro taps the hidden one — flow 25). */}
            <NudgeReveal visible={nudgeVisible && !overlayUp}>
              <MicroTaskNudge {...nudge} />
            </NudgeReveal>
          </>
        )}
      </BlurTargetView>
      {/* Expanded "Right now" sheet (frame 01): scrim over the content, the
          sheet floating where the bar sits. The standing actions below stay
          live (they carry the triage entry in this state). */}
      {contextSheetOpen && !overlayUp ? (
        <Box className="absolute inset-0">
          {/* Blurred scrim (2026-08-11 item 1): the deck genuinely blurs
              behind the sheet; the wash on top keeps the old tone. */}
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(150)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {/* 9.8 D5: theme-aware scrim. The hardcoded light tint + the
                background-100 token (dark: rgb 43 46 44) painted the whole
                backdrop flat dark grey in dark mode — the blur was invisible
                under it. Dark mode now blurs with a dark tint and a gentle
                black wash so the blurred home still reads through. */}
            <BlurView
              intensity={22}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              blurMethod="dimezisBlurView"
              blurTarget={blurTargetRef}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              aria-label="Close context sheet"
              onPress={onCollapseContextSheet}
              className="absolute inset-0 bg-background-100/40 dark:bg-black/25"
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
              availableContexts={availableContexts}
              attentionContexts={attentionContexts}
              mode={mode}
              onToggleContext={onToggleContext}
              onSetMode={onSetMode}
              onDone={onCollapseContextSheet}
            />
          </Animated.View>
        </Box>
      ) : null}
      {cardBack ? <CardBackOverlay {...cardBack} /> : null}
      <QuickAddSheet {...quickAdd} />
    </AppShell>
  );
}
