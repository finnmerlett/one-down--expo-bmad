import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ReviewItem, TaskData } from '@one-down/shared';

import { Pressable } from '@/components/ui/pressable';

import type { UpdateTaskPatch } from '@/services/tasks-repository';
import { CardBack, type CardBackHandle } from './card-back';

const EXPAND_DURATION_MS = 220;
// Collapsed inset == the stack padding (p-6), so the back grows out of the
// resting top card's exact frame and contracts back into it.
const COLLAPSED_INSET = 24;
const EXPANDED_INSET = 12;

/**
 * Expanded card-back view, absolutely positioned over the card stack (the top
 * bar stays visible — UX: it persists across screens). Mount expands from the
 * top-card frame; back button or an edge tap flushes pending text edits, then
 * contracts before unmounting.
 */
export function CardBackOverlay({
  task,
  onPatch,
  onDismiss,
  onStart,
  onCutLoose,
  onConfirm,
  onHelp,
  onKeep,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onDismiss: () => void;
  /** Start/Continue → task running screen (Story 2.1). CardBack flushes drafts itself. */
  onStart?: () => void;
  /** Cut loose → guilt-free archive (Story 2.4). CardBack flushes drafts itself. */
  onCutLoose?: () => void;
  /** Tick-confirm a review item (Story 6.2) — passed straight through to CardBack. */
  onConfirm?: (item: ReviewItem) => void;
  /** Breakdown entry (Story 6.3) — passed straight through to CardBack. */
  onHelp?: () => void;
  /** Health-prompt "Keep it" (Story 7.2) — passed straight through to CardBack. */
  onKeep?: () => void;
}) {
  const cardBackRef = useRef<CardBackHandle>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: EXPAND_DURATION_MS });
  }, [progress]);

  const close = () => {
    cardBackRef.current?.flush();
    progress.value = withTiming(0, { duration: EXPAND_DURATION_MS }, (finished) => {
      // Not finished = close re-triggered (double tap) — let the rerun unmount.
      if (finished) {
        scheduleOnRN(onDismiss);
      }
    });
  };

  // The overlay is a plain view, not a Modal — the Android back gesture must
  // close the card (flushing edits), not fall through and exit the app.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const frameStyle = useAnimatedStyle(() => {
    const inset = interpolate(progress.value, [0, 1], [COLLAPSED_INSET, EXPANDED_INSET]);
    return {
      position: 'absolute' as const,
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      // Crossfade over the card front it covers.
      opacity: progress.value,
    };
  });

  return (
    <>
      {/* Backdrop: the visible margins around the expanded card — "tap around
          the edges" to close (AC7). */}
      <Pressable
        accessibilityRole="button"
        aria-label="Close task details"
        onPress={close}
        className="absolute bottom-0 left-0 right-0 top-0"
      />
      <Animated.View style={frameStyle}>
        <CardBack
          ref={cardBackRef}
          task={task}
          onPatch={onPatch}
          onClose={close}
          onStart={onStart}
          onCutLoose={onCutLoose}
          onConfirm={onConfirm}
          onHelp={onHelp}
          onKeep={onKeep}
        />
      </Animated.View>
    </>
  );
}
