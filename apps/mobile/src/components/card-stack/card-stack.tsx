import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { StarBadge } from '@/services/star-calculator';
import { erosionLoss as computeErosionLoss } from '@/services/star-offers';
import { BonusAura } from './bonus-aura';
import { evaluateTaskHealth } from '@/services/task-health';
import { HEALTH_LABELS, TaskCard } from './task-card';

const VISIBLE_CARDS = 3;
/** v1.5 deck physics: commit once the drag travels ~⅓ of the card width
 *  (design interactive deck: `reach > 92`) — supersedes the 2026-07-27
 *  screen-fraction tuning (ambiguity #18; flip this constant to revert). */
const DISMISS_THRESHOLD_PX = 92;
const FLY_OFF_DISTANCE = 1000;
const FLY_OFF_DURATION_MS = 680;
/** Fling physics (2026-08-11): momentum counts toward the commit — the
 *  release decision projects ~150ms of travel at the release velocity, so a
 *  short fast flick dismisses. The fly-off duration matches the fling speed
 *  (floored so a slow commit still leaves briskly). */
const MOMENTUM_LOOKAHEAD_S = 0.15;
const MIN_FLING_SPEED_PX_S = 900;
const MIN_FLY_OFF_MS = 120;
/** Drag styling from the design deck: slight drop + rotation follow. */
const DRAG_DROP_RATIO = 0.05;
const DRAG_ROTATE_DEG_PER_PX = 0.035;
const SNAP_SPRING = { damping: 70, stiffness: 900 };

// v1.5 fan slots (design SLOTS): each depth sits offset down-right with a
// slight clockwise rotation — a hand-squared pile of paper cards.
const SLOT_X = [0, 7, 15];
const SLOT_Y = [0, 5, 11];
const SLOT_R = [0, 1.1, 2.4];
/** Frame opacity per depth (design FADE). */
const SLOT_FADE = [1, 1, 0.82];
const PROMOTE_DURATION_MS = 200;

const CARD_FRAME = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
const FILL = { height: '100%', width: '100%' } as const;

// Playing-card proportions (owner feedback 2026-07-27): 2.5:3.5.
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 392;
/** |translateX| at which the card has fully left the screen — the advance
 *  fires HERE (mid-flight), not at the end of the 1000px timing. */
const EXIT_X = (Dimensions.get('window').width + CARD_WIDTH) / 2;
/** Corner tap zones (edit top-left, review top-right) routed inside the tap gesture. */
const CORNER_SIZE = 64;
/** The gold/primary band (task-card h-[52px]) pushes the corner markers down
 *  — their tap targets must follow (2026-08-11 item 8). */
const BAND_HEIGHT = 52;

/**
 * The interactive top card OWNS its shared values, so they are born zeroed on
 * mount and there is never a cross-thread reset racing a Fabric commit (the
 * old card unmounts off-screen; the new one mounts centered). The parent
 * remounts it via key on every advance — and the mount entrance animates from
 * the depth-1 fan slot to the top slot, so the promoted card slides square
 * into place instead of jumping.
 */
function SwipeableTopCard({
  task,
  starValue,
  badge,
  topOfDeck,
  accessibilityLabel,
  onDismiss,
  onPress,
  onEdit,
  onReview,
  erosionLoss = 0,
  dragProgress,
  entrance,
}: {
  task: TaskData;
  starValue: number;
  badge: StarBadge | null;
  topOfDeck: boolean;
  accessibilityLabel: string;
  onDismiss: () => void;
  onPress: () => void;
  /** Top-left corner tap → edit surface (2026-07-27). */
  onEdit?: () => void;
  /** Top-right corner tap → check queue, wired only on flagged cards (6.2/D6b). */
  onReview?: () => void;
  /** E5x: what THIS committed pass costs a live offer (0 = no float). */
  erosionLoss?: number;
  /** 0→1: how far the drag has carried the card off-screen — the stacked
   *  cards read this and rise toward their next slot IN STEP with the drag. */
  dragProgress: SharedValue<number>;
  /** false right after a drag advance: the promoted card already sits square
   *  on top (the drag walked it there), so no slot-1 entrance replay. */
  entrance: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Entrance: born at the depth-1 fan slot, settles square to the top slot.
  const settle = useSharedValue(entrance ? 1 : 0);
  const dismissed = useSharedValue(false);

  useEffect(() => {
    if (entrance) settle.value = withTiming(0, { duration: PROMOTE_DURATION_MS });
  }, [entrance, settle]);

  // The stacked cards' promotion tracks the drag continuously — and the
  // advance fires the moment the card has LEFT THE SCREEN (drag or flight),
  // not when the 1000px timing ends (that pause read as lag).
  useAnimatedReaction(
    () => translateX.value,
    (tx) => {
      dragProgress.value = Math.min(Math.abs(tx) / EXIT_X, 1);
      if (!dismissed.value && Math.abs(tx) >= EXIT_X) {
        dismissed.value = true;
        scheduleOnRN(onDismiss);
      }
    },
  );

  const pan = Gesture.Pan()
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    })
    .onEnd((event) => {
      // Momentum counts: project ~150ms of travel at the release velocity,
      // so a short fast flick commits even when the finger barely moved.
      const tx = translateX.value;
      const projected = tx + event.velocityX * MOMENTUM_LOOKAHEAD_S;
      // A flick back toward center after dragging out (sign flip) is a
      // CANCEL — without this the card at +150 could fly to −1000, fast and
      // the wrong way (lift-off velocity spikes made this easy to hit).
      const yankedBack = Math.abs(tx) > 20 && Math.sign(projected) !== Math.sign(tx);
      if (Math.abs(projected) > DISMISS_THRESHOLD_PX && !yankedBack) {
        const direction = Math.sign(projected);
        const target = direction * FLY_OFF_DISTANCE;
        const speed = Math.max(Math.abs(event.velocityX), MIN_FLING_SPEED_PX_S);
        // True travel distance — NOT 1000−|tx|, which under-timed (and so
        // over-sped) any flight that had to cross back over the card.
        const remaining = Math.abs(target - tx);
        translateX.value = withTiming(target, {
          duration: Math.min(
            Math.max((remaining / speed) * 1000, MIN_FLY_OFF_MS),
            FLY_OFF_DURATION_MS,
          ),
          easing: Easing.out(Easing.quad),
        });
        // Dismissal fires from the reaction above at screen exit — a re-grab
        // mid-flight before that still just continues the drag.
      } else {
        translateX.value = withSpring(0, SNAP_SPRING);
        translateY.value = withSpring(0, SNAP_SPRING);
      }
    });

  // Tap-to-open (Story 1.4; rerouted 2026-07-27). Exclusive: the pan wins as
  // soon as the finger moves its minimum distance; the tap can only activate
  // once the pan has FAILED (released without dragging), so a swipe never
  // also opens. Corner taps are routed HERE by location, not left to the
  // transparent corner Pressables painted above this card: RNGH claims the
  // raw touch stream, so those siblings can't be trusted to receive presses
  // (they remain as TalkBack targets — both paths fire idempotent actions).
  // A live band shifts the markers down a band-height — the zones follow.
  const cornerTop = badge || topOfDeck ? BAND_HEIGHT : 0;
  const tap = Gesture.Tap().onEnd((event, success) => {
    if (!success) return;
    if (event.y >= cornerTop && event.y <= cornerTop + CORNER_SIZE) {
      if (onEdit && event.x <= CORNER_SIZE) {
        scheduleOnRN(onEdit);
        return;
      }
      if (onReview && event.x >= CARD_WIDTH - CORNER_SIZE) {
        scheduleOnRN(onReview);
        return;
      }
    }
    scheduleOnRN(onPress);
  });
  const gesture = Gesture.Exclusive(pan, tap);

  // E5x mid-drag erosion float: the clay −N rises off the badge as the drag
  // passes the commit threshold — derived purely from the drag distance.
  const erosionStyle = useAnimatedStyle(() => {
    const dx = Math.abs(translateX.value);
    return {
      opacity: interpolate(
        dx,
        [DISMISS_THRESHOLD_PX, DISMISS_THRESHOLD_PX + 40, DISMISS_THRESHOLD_PX + 180],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            dx,
            [DISMISS_THRESHOLD_PX, DISMISS_THRESHOLD_PX + 180],
            [0, -30],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + settle.value * SLOT_X[1]! },
      {
        translateY:
          translateY.value +
          Math.abs(translateX.value) * DRAG_DROP_RATIO +
          settle.value * SLOT_Y[1]!,
      },
      // Drag rotation follows the finger (design: rotate(dx·0.035°)); the
      // entrance un-rotates from the depth-1 slot angle.
      { rotate: `${translateX.value * DRAG_ROTATE_DEG_PER_PX + settle.value * SLOT_R[1]!}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[CARD_FRAME, animatedStyle]}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        {badge ? <BonusAura /> : null}
        <View className="h-full w-full rounded-[22px] bg-background-0">
          <TaskCard task={task} starValue={starValue} badge={badge} topOfDeck={topOfDeck} />
        </View>
        {erosionLoss > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 30, left: 20 }, erosionStyle]}
          >
            <Text className="font-mono text-lg text-error-600">{`−${erosionLoss}`}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Background card animating toward its fan slot: a single `progress` value
 * tracks depth, so on every advance depth-2 slides square into depth-1, a
 * freshly mounted card eases in from one slot deeper while fading, and a card
 * pushed back down (task added mid-browse) recedes smoothly.
 *
 * v1.5: only the card directly under the top one carries content (it is the
 * next task, ready before the front card leaves); deeper cards are blank
 * card-stock backs — the fan reads as a pile of paper, not a queue of text.
 */
function StackedCard({
  task,
  starValue,
  badge,
  topOfDeck,
  depth,
  dragProgress,
  snap,
}: {
  task: TaskData;
  starValue: number;
  badge: StarBadge | null;
  topOfDeck: boolean;
  depth: number;
  /** The top card's 0→1 off-screen progress — position tracks it live. */
  dragProgress: SharedValue<number>;
  /** true on a drag advance: the drag already walked this card to its new
   *  slot, so the depth change lands as a snap, not a second animation. */
  snap: boolean;
}) {
  const progress = useSharedValue(depth + 1);
  // Mount fade (2026-08-11 item 11): a card entering the window must fade in
  // DURING its slide, not pop to its slot opacity — with a shallow deck the
  // entering card lands at depth 1, whose slot opacity is already 1, so the
  // progress-derived opacity alone showed it instantly.
  const mountFade = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // Fresh card at the back: the only post-release motion — a fade-in
      // synchronized with the slide from one slot deeper.
      mounted.current = true;
      progress.value = withTiming(depth, { duration: PROMOTE_DURATION_MS });
      mountFade.value = withTiming(1, { duration: PROMOTE_DURATION_MS });
    } else if (snap) {
      progress.value = depth;
    } else {
      progress.value = withTiming(depth, { duration: PROMOTE_DURATION_MS });
    }
  }, [depth, progress, mountFade, snap]);

  const frameStyle = useAnimatedStyle(() => {
    // Position rides the live drag: as the top card leaves, every stacked
    // card slides/rotates toward its next slot IN STEP with the finger.
    // Opacity stays on the raw depth value so the new back card's fade-in
    // remains a post-release moment, never a mid-drag preview.
    const effective = Math.min(Math.max(progress.value - dragProgress.value, 0), 2);
    return {
      transform: [
        { translateX: interpolate(effective, [0, 1, 2], SLOT_X) },
        { translateY: interpolate(effective, [0, 1, 2], SLOT_Y) },
        { rotate: `${interpolate(effective, [0, 1, 2], SLOT_R)}deg` },
      ],
      opacity:
        mountFade.value *
        interpolate(
          progress.value,
          [1, 2, VISIBLE_CARDS],
          [SLOT_FADE[1]!, SLOT_FADE[2]!, 0],
          Extrapolation.CLAMP,
        ),
    };
  });

  // Content crossfades out as the card recedes past depth 1 — blank card
  // backs from depth 2 (design: "only the two top cards carry content").
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1, 2], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View pointerEvents="none" style={[CARD_FRAME, frameStyle]}>
      <View className="h-full w-full rounded-[22px] border border-outline-50 bg-background-50">
        <Animated.View style={[FILL, contentStyle]}>
          {depth <= 1 ? (
            <TaskCard task={task} starValue={starValue} badge={badge} topOfDeck={topOfDeck} />
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/**
 * Swipeable deck. Expects an already-curated, non-empty task list — the
 * parent renders the empty state when there is nothing to browse.
 *
 * Wrap-around: the top card is tracked by TASK ID, not index. The index is
 * re-derived from the current list each render, so adding/removing tasks
 * keeps the same card on top instead of resetting the cycle; only if the top
 * task itself disappears does the stack fall back to the list head. (Before
 * the first swipe topTaskId is null — the deck shows "slot 0", so a newly
 * created task that curates to the front becomes the visible top card.
 * Deliberate: see story dev notes.)
 */
export function CardStack({
  tasks,
  getStarValue,
  getBadge,
  getTopOfDeck,
  onCardPress,
  onEditPress,
  onReviewPress,
  onSwipe,
  onTopChange,
}: {
  tasks: TaskData[];
  /** Star value per task (v1.5: the card's size value). */
  getStarValue: (task: TaskData) => number;
  /** Live badge per task (bonus window / don't-skip offer), if any. */
  getBadge?: (task: TaskData) => StarBadge | null;
  /** Whether the task sits in the 2-day top-of-deck window. */
  getTopOfDeck?: (task: TaskData) => boolean;
  onCardPress?: (task: TaskData) => void;
  /** Pencil-icon tap on the top card → edit surface (2026-07-27: card tap now opens the working screen instead). */
  onEditPress?: (task: TaskData) => void;
  /** Info-icon tap on a flagged top card → review mode (Story 6.2). */
  onReviewPress?: (task: TaskData) => void;
  /** A swipe COMMITTED past this task (Story 6.4 skip counting) — pure pass-through. */
  onSwipe?: (task: TaskData) => void;
  /** Reports which task currently sits on top (Story 6.4 nudge targeting). */
  onTopChange?: (task: TaskData) => void;
}) {
  const [topTaskId, setTopTaskId] = useState<string | null>(null);
  // Bumped on every dismiss: remounts the keyed top card (fresh zeroed
  // shared values), including the single-card self-wrap where the id repeats.
  const [cycle, setCycle] = useState(0);
  // Live 0→1 off-screen progress of the top card's drag — owned here so the
  // stacked cards can ride it; reset once a drag advance has committed.
  const dragProgress = useSharedValue(0);
  const dragAdvance = useRef(false);

  // Runs AFTER the children's effects in the same commit: the stacked cards
  // snap their progress to the new depth first, then this reset lands in the
  // same UI-thread batch — the deck never paints an intermediate slot.
  useEffect(() => {
    if (dragAdvance.current) {
      dragProgress.value = 0;
      dragAdvance.current = false;
    }
  }, [cycle, dragProgress]);

  const topIndex = useMemo(() => {
    const index = tasks.findIndex((task) => task.id === topTaskId);
    return index === -1 ? 0 : index;
  }, [tasks, topTaskId]);

  // The pin is only meaningful while the pinned card is still in the deck.
  // Once curation/filters remove it, dissolve the pin — otherwise the stale
  // id re-pins the old card when a later filter change brings it back,
  // overriding 3.3's momentum rule (top card = best quick win) for the new
  // deck. Live-query edits keep the task present, so browsing position still
  // never reshuffles under the user's fingers.
  useEffect(() => {
    if (topTaskId !== null && !tasks.some((task) => task.id === topTaskId)) {
      setTopTaskId(null);
    }
  }, [tasks, topTaskId]);

  // advance() fires from an animation callback well after the gesture ended —
  // read the freshest list/index/handler via a ref so a task created or
  // removed mid-flight can't desync the cycle.
  const latest = useRef({ tasks, topIndex, onSwipe });
  useEffect(() => {
    latest.current = { tasks, topIndex, onSwipe };
  });

  // Surface the current top task (Story 6.4): home renders the micro-task
  // nudge for it, and only the stack knows its own cycle position.
  useEffect(() => {
    const top = tasks[topIndex];
    if (top) onTopChange?.(top);
  }, [tasks, topIndex, onTopChange]);

  const advance = () => {
    const { tasks: currentTasks, topIndex: currentIndex, onSwipe: currentOnSwipe } = latest.current;
    const skipped = currentTasks[currentIndex];
    if (skipped) {
      currentOnSwipe?.(skipped);
    }
    // Drag-driven: the promoted card is already square on top and the fan has
    // already risen — children snap depths, no entrance replay (2026-08-11).
    dragAdvance.current = true;
    const next = currentTasks[(currentIndex + 1) % currentTasks.length];
    if (next) {
      setTopTaskId(next.id);
    }
    setCycle((count) => count + 1);
  };

  if (tasks.length === 0) {
    return null;
  }

  const visibleCount = Math.min(VISIBLE_CARDS, tasks.length);
  const stackWindow: { task: TaskData; depth: number }[] = [];
  for (let depth = 0; depth < visibleCount; depth++) {
    const task = tasks[(topIndex + depth) % tasks.length];
    if (task) {
      stackWindow.push({ task, depth });
    }
  }

  const topTask = stackWindow[0]?.task;
  // Band-aware corner offset for the a11y tap targets (mirrors the gesture
  // routing inside SwipeableTopCard).
  const topCornerTop =
    topTask && ((getBadge?.(topTask) ?? null) || (getTopOfDeck?.(topTask) ?? false))
      ? BAND_HEIGHT
      : 0;

  // Health flag in the top card's a11y label (Story 7.2, AC6): the card is an
  // accessible container, so the visual chip must be announced here too.
  // Appended as a suffix — unflagged labels stay byte-identical to pre-7.2.
  const healthSuffix = (task: TaskData) => {
    const flag = evaluateTaskHealth(task, new Date());
    return flag ? `. ${HEALTH_LABELS[flag]}` : '';
  };

  // Live badge in the label too — the card is an accessible container, so
  // the band's `+N` must be announced (spec §2: value + badge never fold).
  const badgeSuffix = (task: TaskData) => {
    const badge = getBadge?.(task) ?? null;
    return badge ? `. Plus ${badge.amount} bonus right now` : '';
  };

  return (
    // Playing-card deck (owner feedback 2026-07-27, round 2): the card keeps
    // real playing-card proportions (2.5:3.5 → 280×392) with breathing room
    // on every side — centered in the leftover vertical space, never a
    // full-screen fill (that read as one giant card with a dead middle).
    <Box className="flex-1 items-center justify-center py-2">
      <Box className="relative" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        {/* Deepest card first so the top card paints last (highest z). */}
        {stackWindow
          .slice()
          .reverse()
          .map(({ task, depth }) =>
            depth === 0 ? (
              <SwipeableTopCard
                key={`${task.id}:${cycle}`}
                task={task}
                starValue={getStarValue(task)}
                // Star value in the label: the top card is an accessible
                // container (inner text hidden from TalkBack/Maestro), so the
                // preview must be announced here.
                accessibilityLabel={`Task: ${task.title}. Worth ${getStarValue(task)} stars. Card ${topIndex + 1} of ${tasks.length}${badgeSuffix(task)}${healthSuffix(task)}`}
                badge={getBadge?.(task) ?? null}
                topOfDeck={getTopOfDeck?.(task) ?? false}
                erosionLoss={(() => {
                  const live = getBadge?.(task) ?? null;
                  return live?.kind === 'offer' ? computeErosionLoss(task, live.amount) : 0;
                })()}
                onDismiss={advance}
                onPress={() => onCardPress?.(task)}
                onEdit={onEditPress ? () => onEditPress(task) : undefined}
                onReview={
                  task.hasCheckNeeded && onReviewPress ? () => onReviewPress(task) : undefined
                }
                dragProgress={dragProgress}
                entrance={!dragAdvance.current}
              />
            ) : (
              <StackedCard
                key={task.id}
                task={task}
                starValue={getStarValue(task)}
                badge={getBadge?.(task) ?? null}
                topOfDeck={getTopOfDeck?.(task) ?? false}
                depth={depth}
                dragProgress={dragProgress}
                snap={dragAdvance.current}
              />
            ),
          )}
        {/* Corner entries: transparent tap targets OVER the top card's
            markers. They must be siblings painted above the GestureDetector —
            an inner Pressable would be swallowed by the card tap gesture AND
            flattened out of the accessibility tree by the card's accessible
            container. Edit (pencil, top-left) opens the edit surface
            (2026-07-27); review (info, top-right) enters review mode (6.2). */}
        {topTask && onEditPress ? (
          <Pressable
            accessibilityRole="button"
            aria-label={`Edit task: ${topTask.title}`}
            hitSlop={8}
            onPress={() => onEditPress(topTask)}
            className="absolute left-0 h-14 w-14"
            style={{ top: topCornerTop }}
          />
        ) : null}
        {topTask?.hasCheckNeeded && onReviewPress ? (
          <Pressable
            accessibilityRole="button"
            aria-label="Needs review"
            hitSlop={8}
            onPress={() => onReviewPress(topTask)}
            className="absolute right-0 h-14 w-14"
            style={{ top: topCornerTop }}
          />
        ) : null}
      </Box>
    </Box>
  );
}
