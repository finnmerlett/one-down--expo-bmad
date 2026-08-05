import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import {
  parseReviewFlags,
  parseTaskContexts,
  TASK_CONTEXTS,
  TASK_SIZES,
  type ReviewItem,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, CalendarDaysIcon, CheckIcon, EditIcon, Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import { track } from '@/lib/analytics/track';
import { CONTEXT_ICONS } from '@/components/stack-filters/context-icons';
import { taskValue } from '@/services/star-calculator';
import { evaluateTaskHealth } from '@/services/task-health';
import type { UpdateTaskPatch } from '@/services/tasks-repository';
import { CONTEXT_LABELS, SIZE_LABELS } from './task-card';
import { TaskHealthPrompt } from './task-health-prompt';

export interface CardBackHandle {
  /** Persist any in-flight text edits (called before the card contracts). */
  flush: () => void;
}

/** Mono caps section label (v1.5 spec §1). */
function CapsLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-400">
      {children}
    </Text>
  );
}

/** Blueprint-blue `WE GUESSED` tag — blue = "we guessed, you haven't agreed"
 *  (spec §2); it sits at the right end of a flagged group's label line. */
function GuessedTag() {
  return (
    <Text className="font-mono text-[11px] uppercase tracking-caps text-info-600">We guessed</Text>
  );
}

/** The one navy tick that confirms a whole guessed group (frame 06). */
function GroupTick({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-label={label}
      hitSlop={8}
      onPress={onPress}
      className="h-9 w-9 flex-none items-center justify-center rounded-full bg-info-600 active:bg-info-700"
    >
      <Icon as={CheckIcon} size="sm" className="text-typography-0" />
    </Pressable>
  );
}

/** Group wrapper: caps label + optional WE GUESSED tag on the label line. */
function Group({
  label,
  guessed = false,
  children,
}: {
  label: string;
  guessed?: boolean;
  children: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      <HStack className="items-center justify-between">
        <CapsLabel>{label}</CapsLabel>
        {guessed ? <GuessedTag /> : null}
      </HStack>
      {children}
    </VStack>
  );
}

function Chip({
  label,
  accessibilityLabel,
  selected,
  guessed = false,
  icon,
  onPress,
  role = 'button',
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  /** Awaiting agreement — selected chips render blue-tinted + dashed. */
  guessed?: boolean;
  icon?: (typeof CONTEXT_ICONS)[TaskContext];
  onPress: () => void;
  /** Context toggles are switches (checked); the size selector is buttons (selected). */
  role?: 'button' | 'switch';
}) {
  const chipClass = selected
    ? guessed
      ? 'border-[1.5px] border-dashed border-[rgba(30,52,80,0.42)] bg-info-50'
      : 'border border-primary-300 bg-primary-50'
    : 'border border-outline-200 bg-background-0';
  const textClass = selected
    ? guessed
      ? 'font-body-semibold text-sm text-info-800'
      : 'font-body-semibold text-sm text-primary-700'
    : 'font-body-medium text-sm text-typography-600';
  const iconClass = selected
    ? guessed
      ? 'text-info-700'
      : 'text-primary-700'
    : 'text-typography-500';

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'switch' ? { checked: selected } : { selected }}
      aria-label={accessibilityLabel}
      onPress={onPress}
      className={`flex-row items-center gap-[7px] rounded-full px-4 py-2 ${chipClass}`}
    >
      {icon ? <Icon as={icon} size="sm" className={iconClass} /> : null}
      <Text className={textClass}>{label}</Text>
    </Pressable>
  );
}

/**
 * Card back, v1.5 "edit in place" (frame 06 + Row F): `✏ EDITING CARD`
 * header with the gold `★ N` value pill, Gabarito title over a hairline,
 * DETAILS, then per-group rows with the F-treatment — a guessed group says
 * `WE GUESSED` in blueprint blue, its value sits on a blue-tinted dashed row,
 * and ONE navy tick agrees to the whole group; confirming clears the chrome
 * to plain paper instantly. A task with nothing to go on gets the grey
 * `NOTHING TO GO ON` row instead (calendar or None settles it).
 *
 * Start/Cut loose no longer live here (working screen owns them); the bottom
 * is `Confirm all guesses` (only while guesses are pending) + `Done editing`.
 * Text fields hold local drafts and emit a patch only when the value actually
 * changed; `flush()` saves pending drafts when the card closes mid-edit.
 */
export function CardBack({
  task,
  onPatch,
  onClose,
  onStart,
  onCutLoose,
  onConfirm,
  onConfirmAll,
  onKeep,
  backLabel = 'Back to card front',
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onClose: () => void;
  /** Health-prompt "Break it down" → running screen (Story 7.2). */
  onStart?: () => void;
  /** Health-prompt "Cut loose" → guilt-free archive (Story 7.2). */
  onCutLoose?: () => void;
  /** Tick-confirm a review item without editing it (Story 6.2). Omitted = no ticks. */
  onConfirm?: (item: ReviewItem) => void;
  /** Batch confirm for `Confirm all guesses` — MUST apply sequentially (the
   *  per-item writes race on the same flags JSON). Falls back to onConfirm. */
  onConfirmAll?: (items: ReviewItem[]) => void;
  /** "Keep it" on the health prompt (Story 7.2) — registers engagement, clearing the flag. */
  onKeep?: () => void;
  /** A11y label for the back button — contextual per surface (overlay vs list detail). */
  backLabel?: string;
  ref?: Ref<CardBackHandle>;
}) {
  // Drafts OVERLAY the stored value while editing (null = not editing, the
  // field follows the DB). When the stored value changes the draft drops:
  // during normal editing that's just our own write landing via the live
  // query (same text, no visual change); otherwise another screen (task
  // running, Story 2.1) wrote while this card sat mounted-but-hidden beneath
  // it, and stored truth must win — flushing a mount-time snapshot here used
  // to wipe running-screen notes (review blocker).
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [detailsDraft, setDetailsDraft] = useState<string | null>(null);
  useEffect(() => setTitleDraft(null), [task.title]);
  useEffect(() => setDetailsDraft(null), [task.details]);

  const title = titleDraft ?? task.title;
  const details = detailsDraft ?? task.details ?? '';

  const flushTitle = () => {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === task.title) {
      // Blank reverts (titles can't be emptied); unchanged needs no write.
      setTitleDraft(null);
      return;
    }
    // The draft stays up until the write round-trips through the live query.
    onPatch({ title: trimmed });
  };

  const flushDetails = () => {
    if (detailsDraft === null) return;
    const trimmed = detailsDraft.trim();
    const next = trimmed ? trimmed : null;
    if (next === (task.details ?? null)) {
      setDetailsDraft(null);
      return;
    }
    onPatch({ details: next });
  };

  useImperativeHandle(ref, () => ({
    flush: () => {
      flushTitle();
      flushDetails();
    },
  }));

  const activeContexts = parseTaskContexts(task.contexts);

  const toggleContext = (context: TaskContext) => {
    // Rebuild from the canonical union order so stored JSON stays stable.
    const next = TASK_CONTEXTS.filter((candidate) =>
      candidate === context
        ? !activeContexts.includes(candidate)
        : activeContexts.includes(candidate),
    );
    onPatch({ contexts: next });
  };

  const selectSize = (size: TaskSize) => {
    // Tapping the selected size again clears it back to unset. The header
    // star pill follows on the next render (value = f(size)).
    onPatch({ size: task.size === size ? null : size });
  };

  // Flush-then-act (Story 2.4, AC4): released/started tasks keep their
  // latest text — persist drafts BEFORE navigating away (health prompt).
  const handleStart = () => {
    flushTitle();
    flushDetails();
    onStart?.();
  };

  const handleCutLoose = () => {
    flushTitle();
    flushDetails();
    onCutLoose?.();
  };

  const handleDone = () => {
    flushTitle();
    flushDetails();
    onClose();
  };

  const deadlineLabel = task.deadline
    ? task.deadline.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : 'No deadline';

  // Review flags (Story 6.2 → v1.5 F-treatment): guessed groups carry the
  // blueprint chrome until agreed or edited.
  const reviewFlags = parseReviewFlags(task.reviewFlags);
  const inferred = reviewFlags?.inferred ?? [];
  const missingDeadline = reviewFlags?.missingDeadline === true;
  const deadlineGuessed = inferred.includes('deadline');
  const contextsGuessed = inferred.includes('contexts');
  const sizeGuessed = inferred.includes('size');

  const confirmAll = () => {
    if (onConfirmAll) {
      onConfirmAll([...inferred]);
      return;
    }
    if (!onConfirm) return;
    for (const item of inferred) onConfirm(item);
  };

  // Task-health prompt (Story 7.2, AC5): recomputed per render — "Keep it"
  // writes engagement, the live query re-renders, the flag (and prompt)
  // clears reactively (AC7). Shown-event fires once per card-back open: the
  // component mounts fresh each time a back is opened, so a ref suffices.
  const healthFlag = evaluateTaskHealth(task, new Date());
  const promptShownRef = useRef(false);
  useEffect(() => {
    if (healthFlag && !promptShownRef.current) {
      promptShownRef.current = true;
      track('task_health_prompt_shown', { flag: healthFlag });
    }
  }, [healthFlag]);

  const [showPicker, setShowPicker] = useState(false);
  const patchDeadline = (next: Date | null) => {
    // Change-gated like the text fields — no spurious updatedAt bumps.
    if ((task.deadline?.getTime() ?? null) === (next?.getTime() ?? null)) return;
    onPatch({ deadline: next });
  };

  /** White calendar button (blue hairline on guessed rows). */
  const calendarButton = (guessed: boolean) => (
    <Pressable
      accessibilityRole="button"
      aria-label="Pick a deadline date"
      hitSlop={6}
      onPress={() => setShowPicker(true)}
      className={`h-9 w-9 flex-none items-center justify-center rounded-[10px] border bg-background-0 ${
        guessed ? 'border-info-200' : 'border-outline-200'
      }`}
    >
      <Icon
        as={CalendarDaysIcon}
        size="sm"
        className={guessed ? 'text-info-600' : 'text-typography-500'}
      />
    </Pressable>
  );

  return (
    <Box className="h-full w-full overflow-hidden rounded-[28px] border border-outline-100 bg-background-0 shadow-soft-card">
      <HStack className="items-center gap-1 px-3 pt-3">
        <Pressable
          accessibilityRole="button"
          aria-label={backLabel}
          hitSlop={8}
          onPress={handleDone}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Icon as={ArrowLeftIcon} size="lg" className="text-typography-700" />
        </Pressable>
        <Icon as={EditIcon} size="2xs" className="text-primary-600" />
        <Text className="font-mono text-[11px] uppercase tracking-caps text-primary-600">
          Editing card
        </Text>
        <Box className="flex-1" />
        {/* The card's worth, gold pill (no "when done" here — frame 06). */}
        <HStack
          accessible
          accessibilityLabel={`Worth ${taskValue(task)} stars`}
          className="h-8 items-center gap-1.5 rounded-full border border-tertiary-300 bg-tertiary-100 px-[13px]"
        >
          <Text className="text-xs text-tertiary-500">★</Text>
          <Text className="font-mono text-[13px] leading-none text-tertiary-700">
            {taskValue(task)}
          </Text>
        </HStack>
      </HStack>
      {/* Edge-to-edge Android never resizes for the keyboard (same as the
          quick-add sheet) — explicit padding keeps the lower fields
          reachable while editing. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        {/* persistTaps: a toggle tap with the keyboard up must both blur
            (save) and register, not just dismiss the keyboard. */}
        <ScrollView keyboardShouldPersistTaps="handled">
          <VStack className="gap-5 px-6 pb-6 pt-1">
            {/* Gabarito title over a hairline (frame 06). */}
            <Box className="border-b border-outline-100 pb-3">
              <Input size="lg" variant="underlined" className="border-b-0">
                <InputField
                  aria-label="Task title"
                  placeholder="What needs doing?"
                  value={title}
                  onChangeText={setTitleDraft}
                  onBlur={flushTitle}
                  className="font-heading text-[27px] leading-[32px] text-typography-900"
                />
              </Input>
            </Box>
            <VStack className="gap-2">
              <CapsLabel>Details</CapsLabel>
              <Textarea size="md" className="rounded-[15px] border-outline-100 bg-background-0">
                <TextareaInput
                  aria-label="Task details"
                  placeholder="Add details"
                  value={details}
                  onChangeText={setDetailsDraft}
                  onBlur={flushDetails}
                />
              </Textarea>
            </VStack>
            <Group label="Deadline" guessed={deadlineGuessed}>
              {missingDeadline ? (
                // NOTHING TO GO ON (frame 06 variant): grey dashed row —
                // pick a date or agree there is none; either settles it.
                <VStack className="gap-1.5">
                  <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-300">
                    Nothing to go on
                  </Text>
                  <HStack className="h-[52px] items-center gap-2.5 rounded-[15px] border-[1.5px] border-dashed border-outline-200 px-4">
                    <Text className="flex-1 font-body-medium text-sm text-typography-400">
                      Missing this detail
                    </Text>
                    {calendarButton(false)}
                    <Pressable
                      accessibilityRole="button"
                      aria-label="No deadline needed"
                      hitSlop={6}
                      onPress={() => onConfirm?.('missingDeadline')}
                      className="h-9 flex-none items-center justify-center rounded-[10px] border border-outline-200 bg-background-0 px-3"
                    >
                      <Text className="font-body-semibold text-[13px] text-typography-600">
                        None
                      </Text>
                    </Pressable>
                  </HStack>
                </VStack>
              ) : deadlineGuessed ? (
                <HStack className="h-[52px] items-center gap-2.5 rounded-[15px] border-[1.5px] border-dashed border-[rgba(30,52,80,0.42)] bg-info-50 px-4">
                  <Text className="flex-1 font-body-semibold text-[15px] text-info-800">
                    {deadlineLabel}
                  </Text>
                  {calendarButton(true)}
                  {onConfirm ? (
                    <GroupTick label="Confirm deadline" onPress={() => onConfirm('deadline')} />
                  ) : null}
                </HStack>
              ) : (
                <HStack className="h-[52px] items-center gap-2.5 rounded-[15px] border border-outline-100 bg-background-0 px-4">
                  <Text className="flex-1 font-body-semibold text-[15px] text-typography-900">
                    {deadlineLabel}
                  </Text>
                  {task.deadline ? (
                    <Pressable
                      accessibilityRole="button"
                      aria-label="Clear deadline"
                      hitSlop={6}
                      onPress={() => patchDeadline(null)}
                    >
                      <Text className="font-body-medium text-[13px] text-typography-400">
                        Clear
                      </Text>
                    </Pressable>
                  ) : null}
                  {calendarButton(false)}
                </HStack>
              )}
              {showPicker ? (
                <DateTimePicker
                  value={task.deadline ?? new Date()}
                  mode="date"
                  onChange={(event, picked) => {
                    setShowPicker(false);
                    if (event.type === 'set' && picked) {
                      // 18:00-local convention (Story 6.2).
                      const next = new Date(picked);
                      next.setHours(18, 0, 0, 0);
                      patchDeadline(next);
                    }
                  }}
                />
              ) : null}
            </Group>
            <Group label="Requires" guessed={contextsGuessed}>
              <HStack className="items-start gap-2.5">
                <HStack className="min-w-0 flex-1 flex-wrap gap-2">
                  {TASK_CONTEXTS.map((context) => (
                    <Chip
                      key={context}
                      label={CONTEXT_LABELS[context]}
                      accessibilityLabel={`Context: ${CONTEXT_LABELS[context]}`}
                      selected={activeContexts.includes(context)}
                      guessed={contextsGuessed}
                      icon={CONTEXT_ICONS[context]}
                      onPress={() => toggleContext(context)}
                      role="switch"
                    />
                  ))}
                </HStack>
                {contextsGuessed && onConfirm ? (
                  <GroupTick label="Confirm contexts" onPress={() => onConfirm('contexts')} />
                ) : null}
              </HStack>
            </Group>
            <Group label="Size" guessed={sizeGuessed}>
              <HStack className="items-center gap-2.5">
                <HStack className="flex-1 gap-2">
                  {TASK_SIZES.map((size) => (
                    <Chip
                      key={size}
                      label={SIZE_LABELS[size]}
                      accessibilityLabel={`Size: ${SIZE_LABELS[size]}`}
                      selected={task.size === size}
                      guessed={sizeGuessed}
                      onPress={() => selectSize(size)}
                    />
                  ))}
                </HStack>
                {sizeGuessed && onConfirm ? (
                  <GroupTick label="Confirm size" onPress={() => onConfirm('size')} />
                ) : null}
              </HStack>
            </Group>
            {/* Task-health prompt (Story 7.2): inline and ignorable. Its
                actions are the only Start/Cut-loose paths left on the back. */}
            {healthFlag ? (
              <TaskHealthPrompt
                flag={healthFlag}
                onKeep={
                  onKeep
                    ? () => {
                        track('task_health_prompt_actioned', { flag: healthFlag, action: 'keep' });
                        onKeep();
                      }
                    : undefined
                }
                onCutLoose={
                  onCutLoose
                    ? () => {
                        track('task_health_prompt_actioned', {
                          flag: healthFlag,
                          action: 'cut_loose',
                        });
                        handleCutLoose();
                      }
                    : undefined
                }
                onBreakDown={
                  onStart
                    ? () => {
                        track('task_health_prompt_actioned', {
                          flag: healthFlag,
                          action: 'break_down',
                        });
                        handleStart();
                      }
                    : undefined
                }
              />
            ) : null}
            <VStack className="gap-2.5 pt-2">
              {/* One tap agrees to every pending guess; the small gold star
                  is the queue-clear hint (spec §6 / Row E). */}
              {inferred.length > 0 && onConfirm ? (
                <Pressable
                  accessibilityRole="button"
                  aria-label="Confirm all guesses"
                  onPress={confirmAll}
                  className="h-[50px] flex-row items-center justify-center rounded-full bg-info-100 active:bg-info-200"
                >
                  <Text className="font-body-semibold text-[15px] text-info-800">
                    Confirm all guesses
                  </Text>
                  <Text className="absolute right-5 text-xs text-tertiary-500">★</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                aria-label="Done editing"
                onPress={handleDone}
                className="h-[54px] flex-row items-center justify-center gap-[9px] rounded-full bg-primary-500 shadow-fab active:bg-primary-600"
              >
                <Icon as={CheckIcon} size="md" className="text-typography-0" />
                <Text className="font-body-bold text-base text-typography-0">Done editing</Text>
              </Pressable>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
