import { useEffect, useState, type ReactNode } from 'react';
import Animated, {
  Easing,
  LinearTransition,
  useReducedMotion,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from 'react-native-reanimated';

import { sizeKeyOf, STAR_WEIGHTS, type SubtaskData, type TaskSize } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { EditIcon, Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import type { StepChangeReport } from '@/hooks/use-step-actions';

import { StepRow, type StepGrade } from './step-row';

// 9.8 F2 — window-slide choreography: when a tick moves the 3-step window,
// the row leaving the top collapses + fades while the row entering at the
// bottom expands + fades in, and the rows in between glide (one duration,
// symmetric ease-in-out; exact reverse when a tick is undone). Reanimated
// removes an exiting view from layout immediately and animates a ghost — the
// glide of the remaining rows comes from the layout transition, tuned to the
// same curve so the three movements read as one.
const STEP_WINDOW_MS = 260;
const STEP_WINDOW_EASE = Easing.inOut(Easing.quad);

const stepEnter = (values: EntryAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 0, height: 0 },
    animations: {
      opacity: withTiming(1, { duration: STEP_WINDOW_MS, easing: STEP_WINDOW_EASE }),
      height: withTiming(values.targetHeight, {
        duration: STEP_WINDOW_MS,
        easing: STEP_WINDOW_EASE,
      }),
    },
  };
};

const stepExit = (values: ExitAnimationsValues) => {
  'worklet';
  return {
    initialValues: { opacity: 1, height: values.currentHeight },
    animations: {
      opacity: withTiming(0, { duration: STEP_WINDOW_MS, easing: STEP_WINDOW_EASE }),
      height: withTiming(0, { duration: STEP_WINDOW_MS, easing: STEP_WINDOW_EASE }),
    },
  };
};

/** One animated slot in the step list. Plain styles only — reanimated views
 *  are not css-interop registered; the old container gap-2 moved into the
 *  slot's padding so a collapsing row removes its gap with it. */
function StepSlot({ animate, children }: { animate: boolean; children: ReactNode }) {
  return (
    <Animated.View
      entering={animate ? stepEnter : undefined}
      exiting={animate ? stepExit : undefined}
      layout={
        animate ? LinearTransition.duration(STEP_WINDOW_MS).easing(STEP_WINDOW_EASE) : undefined
      }
      style={{ overflow: 'hidden', paddingBottom: 8 }}
    >
      {children}
    </Animated.View>
  );
}

/** The label-line summary of the last AI action (05e): `2 ADDED · 1 CHANGED`. */
export function reportLabel(report: Pick<StepChangeReport, 'added' | 'changed'>): string {
  const parts = [
    report.added > 0 ? `${report.added} ADDED` : null,
    report.changed > 0 ? `${report.changed} CHANGED` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'NO CHANGES';
}

/**
 * The step list on the working screen (v1.5 spec §5): `STEPS` caps label,
 * rows graded done → now → later (only one row ever looks live — the first
 * uncompleted), done rows carrying their banked hollow stars. A11y rows keep
 * the 6.3 checkbox contract.
 *
 * After an AI action (D4) the label line reports what changed —
 * `STEPS  2 ADDED · 1 CHANGED  [Undo]` — and the affected rows carry NEW
 * tags. While an action is in flight the rows fade to 45%.
 */
export function SubtaskList({
  subtasks,
  taskSize = null,
  onToggle,
  onDelete,
  report = null,
  onUndo,
  onEditSteps,
  faded = false,
  hiddenAbove = 0,
  hiddenBelow = 0,
}: {
  subtasks: SubtaskData[];
  /** Parent task size — sets how many hollow stars a done row shows. */
  taskSize?: TaskSize | null;
  onToggle?: (subtask: SubtaskData) => void;
  onDelete?: (subtask: SubtaskData) => void;
  /** Last AI action's change report — drives the label line + NEW tags. */
  report?: StepChangeReport | null;
  /** Undo the reported change (only rendered alongside a report). */
  onUndo?: () => void;
  /** Opens steps edit mode (the `Edit` chip). Omitted = no chip. */
  onEditSteps?: () => void;
  /** An AI action is rewriting the list — rows drop to 45% (05d). */
  faded?: boolean;
  /** Collapsed 3-step window (2026-08-11 item 6): steps hidden above the
   *  slice. They are all COMPLETED by construction (the window starts at
   *  the current step minus one), so they also seed the banked-star count. */
  hiddenAbove?: number;
  /** Steps hidden below the slice — draws the trailing ellipsis row. */
  hiddenBelow?: number;
}) {
  // Window-slide animations arm only AFTER first paint: the list appearing
  // with the screen must not play a cascade of expansions. Hook order is
  // stable — the empty early-return sits below the hooks.
  const reduceMotion = useReducedMotion();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(true);
  }, []);
  const animate = armed && !reduceMotion;

  if (subtasks.length === 0) return null;

  const nowId = subtasks.find((subtask) => !subtask.completed)?.id;
  const sizeKey = sizeKeyOf(taskSize);
  // Hollow stars per done row (1 quick win / 2 big time) — rows past the
  // banking cap show none, matching what they actually banked.
  const bankPerStep = STAR_WEIGHTS.stepBank[sizeKey];
  const bankCap = STAR_WEIGHTS.stepBankCap[sizeKey];

  const gradeOf = (subtask: SubtaskData): StepGrade =>
    subtask.completed ? 'done' : subtask.id === nowId ? 'now' : 'later';

  // Hidden-above rows are all done — they consumed bank slots first.
  let doneSeen = hiddenAbove;

  return (
    <VStack className="gap-2.5">
      <HStack className="min-h-6 items-center gap-2.5">
        <Text className="font-mono text-xs uppercase tracking-caps text-typography-400">Steps</Text>
        {report ? (
          <>
            <Text className="font-mono text-xs uppercase tracking-caps text-primary-600">
              {reportLabel(report)}
            </Text>
            {onUndo ? (
              <Pressable
                accessibilityRole="button"
                aria-label="Undo step changes"
                hitSlop={6}
                onPress={onUndo}
                className="rounded-full bg-primary-50 px-[9px] py-[2px] active:bg-primary-100"
              >
                <Text className="font-body-semibold text-xs text-primary-700">Undo</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        <Box className="flex-1" />
        {onEditSteps ? (
          <Pressable
            accessibilityRole="button"
            aria-label="Edit steps"
            hitSlop={6}
            onPress={onEditSteps}
            className="flex-row items-center gap-[5px] rounded-full bg-primary-50 px-[11px] py-[3px] active:bg-primary-100"
          >
            <Icon as={EditIcon} size="2xs" className="text-primary-700" />
            <Text className="font-body-semibold text-xs text-primary-700">Edit</Text>
          </Pressable>
        ) : null}
      </HStack>
      {/* Slot padding replaces the old gap-2 (see StepSlot) — the -pb-2
          equivalent isn't needed: the trailing 8px reads as breathing room. */}
      <VStack className={faded ? 'opacity-[0.45]' : ''} pointerEvents={faded ? 'none' : 'auto'}>
        {hiddenAbove > 0 ? (
          <StepSlot animate={animate}>
            <EllipsisRow count={hiddenAbove} where="earlier" />
          </StepSlot>
        ) : null}
        {subtasks.map((subtask) => {
          const grade = gradeOf(subtask);
          const banked = grade === 'done' ? (++doneSeen <= bankCap ? bankPerStep : 0) : 0;
          return (
            <StepSlot key={subtask.id} animate={animate}>
              <StepRow
                subtask={subtask}
                grade={grade}
                bankedStars={banked}
                isNew={!subtask.completed && (report?.newTitles.has(subtask.title) ?? false)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            </StepSlot>
          );
        })}
        {hiddenBelow > 0 ? (
          <StepSlot animate={animate}>
            <EllipsisRow count={hiddenBelow} where="later" />
          </StepSlot>
        ) : null}
      </VStack>
    </VStack>
  );
}

/** Collapsed-window marker: steps exist past this edge (item 6). */
function EllipsisRow({ count, where }: { count: number; where: 'earlier' | 'later' }) {
  return (
    <Box
      accessible
      accessibilityLabel={`${count} ${where} ${count === 1 ? 'step' : 'steps'} hidden`}
      className="items-center py-0.5"
    >
      <Text className="font-mono text-sm leading-none text-typography-300">⋯</Text>
    </Box>
  );
}
