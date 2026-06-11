import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { TaskCard } from './task-card';

const VISIBLE_CARDS = 3;
/** Drag past this fraction of the screen width to dismiss (story-tuned value — deliberately under half). */
const DISMISS_THRESHOLD_RATIO = 0.35;
const FLY_OFF_RATIO = 1.2;
const FLY_OFF_DURATION_MS = 250;
const SNAP_SPRING = { damping: 70, stiffness: 900 };

// Background-card stagger. translateY must out-run the bottom-edge rise from
// the scale shrink (~2.5% of card height per depth) or the card hides
// entirely behind the top card (AC1 peek). The promoted card's entrance
// animation starts from the depth-1 values, so keep them in sync.
const DEPTH_SCALE_STEP = 0.05;
const DEPTH_TRANSLATE_STEP = 30;
const DEPTH_1_OPACITY = 0.7;
const DEPTH_2_OPACITY = 0.4;
const PROMOTE_DURATION_MS = 200;

const CARD_FRAME = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
const FILL = { height: '100%', width: '100%' } as const;

/**
 * The interactive top card OWNS its shared values, so they are born zeroed on
 * mount and there is never a cross-thread reset racing a Fabric commit (the
 * old card unmounts off-screen; the new one mounts centered). The parent
 * remounts it via key on every advance — and the mount entrance animates from
 * the depth-1 background position to full size, so the promoted card grows
 * into place instead of jumping.
 */
function SwipeableTopCard({
  task,
  accessibilityLabel,
  onDismiss,
  onPress,
}: {
  task: TaskData;
  accessibilityLabel: string;
  onDismiss: () => void;
  onPress: () => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Entrance: born at the depth-1 background position, settles to the top slot.
  const settleY = useSharedValue(DEPTH_TRANSLATE_STEP);
  const settleScale = useSharedValue(1 - DEPTH_SCALE_STEP);
  const contentFade = useSharedValue(DEPTH_1_OPACITY);

  useEffect(() => {
    const timing = { duration: PROMOTE_DURATION_MS };
    settleY.value = withTiming(0, timing);
    settleScale.value = withTiming(1, timing);
    contentFade.value = withTiming(1, timing);
  }, [settleY, settleScale, contentFade]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > screenWidth * DISMISS_THRESHOLD_RATIO) {
        const direction = Math.sign(translateX.value);
        translateX.value = withTiming(
          direction * screenWidth * FLY_OFF_RATIO,
          { duration: FLY_OFF_DURATION_MS },
          (finished) => {
            // finished is false when a new touch re-grabs the card mid-flight
            // (the drag simply continues) — only a completed fly-off advances.
            if (finished) {
              scheduleOnRN(onDismiss);
            }
          },
        );
      } else {
        translateX.value = withSpring(0, SNAP_SPRING);
        translateY.value = withSpring(0, SNAP_SPRING);
      }
    });

  // Tap-to-flip (Story 1.4). Exclusive: the pan wins as soon as the finger
  // moves its minimum distance; the tap can only activate once the pan has
  // FAILED (released without dragging), so a swipe never also flips.
  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) {
      scheduleOnRN(onPress);
    }
  });
  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + settleY.value },
      { scale: settleScale.value },
    ],
  }));

  const fadeStyle = useAnimatedStyle(() => ({ opacity: contentFade.value }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[CARD_FRAME, animatedStyle]}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        {/* Solid base under the fading content so the entrance fade never
            shows the card below through this one. */}
        <View className="h-full w-full rounded-3xl bg-background-0">
          <Animated.View style={[FILL, fadeStyle]}>
            <TaskCard task={task} />
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Background card that animates toward its current slot: a single `progress`
 * value tracks depth, so on every advance depth-2 rises/brightens into
 * depth-1, a freshly mounted card rises in from one slot deeper while fading
 * in (AC4), and a card pushed back down (task added mid-browse) recedes
 * smoothly. The solid base fades only on entry (progress 2→3 region) — at
 * resting depths it is opaque, so lower cards never show through the content
 * fade.
 */
function StackedCard({ task, depth }: { task: TaskData; depth: number }) {
  const progress = useSharedValue(depth + 1);

  useEffect(() => {
    progress.value = withTiming(depth, { duration: PROMOTE_DURATION_MS });
  }, [depth, progress]);

  const frameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * DEPTH_TRANSLATE_STEP },
      { scale: 1 - progress.value * DEPTH_SCALE_STEP },
    ],
  }));

  const baseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [VISIBLE_CARDS - 1, VISIBLE_CARDS],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1, 2],
      [1, DEPTH_1_OPACITY, DEPTH_2_OPACITY],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View pointerEvents="none" style={[CARD_FRAME, frameStyle]}>
      <Animated.View style={[FILL, baseStyle]}>
        <View className="h-full w-full rounded-3xl bg-background-0">
          <Animated.View style={[FILL, contentStyle]}>
            <TaskCard task={task} />
          </Animated.View>
        </View>
      </Animated.View>
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
  onCardPress,
}: {
  tasks: TaskData[];
  onCardPress?: (task: TaskData) => void;
}) {
  const [topTaskId, setTopTaskId] = useState<string | null>(null);
  // Bumped on every dismiss: remounts the keyed top card (fresh zeroed
  // shared values), including the single-card self-wrap where the id repeats.
  const [cycle, setCycle] = useState(0);

  const topIndex = useMemo(() => {
    const index = tasks.findIndex((task) => task.id === topTaskId);
    return index === -1 ? 0 : index;
  }, [tasks, topTaskId]);

  // advance() fires from an animation callback up to 250ms after the gesture
  // ended — read the freshest list/index via a ref so a task created or
  // removed mid-flight can't desync the cycle.
  const latest = useRef({ tasks, topIndex });
  useEffect(() => {
    latest.current = { tasks, topIndex };
  });

  const advance = () => {
    const { tasks: currentTasks, topIndex: currentIndex } = latest.current;
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

  return (
    <Box className="flex-1 px-6 py-6">
      <Box className="relative flex-1">
        {/* Deepest card first so the top card paints last (highest z). */}
        {stackWindow
          .slice()
          .reverse()
          .map(({ task, depth }) =>
            depth === 0 ? (
              <SwipeableTopCard
                key={`${task.id}:${cycle}`}
                task={task}
                accessibilityLabel={`Task: ${task.title}. Card ${topIndex + 1} of ${tasks.length}`}
                onDismiss={advance}
                onPress={() => onCardPress?.(task)}
              />
            ) : (
              <StackedCard key={task.id} task={task} depth={depth} />
            ),
          )}
      </Box>
    </Box>
  );
}
