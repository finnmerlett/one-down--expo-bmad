import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { TextInput } from 'react-native';

import {
  parseReviewFlags,
  parseTaskContexts,
  TASK_CONTEXTS,
  TASK_CRITICALITIES,
  TASK_SIZES,
  type TaskContext,
  type TaskCriticality,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { CheckIcon, Icon, TrashIcon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CONTEXT_LABELS, CRITICALITY_LABELS, SIZE_LABELS } from '@/components/card-stack/task-card';
import { taskValue } from '@/services/star-calculator';

/** What Save and next commits — drafts live HERE, nothing writes until then. */
export interface BlueprintDraft {
  title: string;
  details: string;
  size: TaskSize | null;
  /** How bad missing the deadline would be (9-5 item 15); null = chill. */
  criticality: TaskCriticality | null;
  contexts: TaskContext[];
  deadline: Date | null;
  /** The user answered the missing-deadline gap with `None`. */
  answeredNone: boolean;
}

// Blueprint palette (spec §9) — its own dark world, deliberately literal.
const INK_BRIGHT = '#EAF3FC';
const INK_MID = '#A6C8EE';
const INK_LABEL = '#8FB4E0';

/**
 * One editable card in blueprint triage (Row D): dashed #1E3450 card over
 * the grid ground, title + details editable in place, SIZE / REQUIRES /
 * DEADLINE groups with `WE GUESSED` / `NOTHING TO GO ON` label lines.
 * All edits stay in a local draft until `Save and next`.
 */
export function BlueprintCard({
  task,
  onSave,
  onSkip,
  onDelete,
}: {
  task: TaskData;
  onSave: (draft: BlueprintDraft) => void;
  onSkip: () => void;
  /** 9.8 G11 — top-right bin: recycle-bin the task (no award, undoable). */
  onDelete?: () => void;
}) {
  const flags = parseReviewFlags(task.reviewFlags);
  const inferred = flags?.inferred ?? [];
  const missingDeadline = flags?.missingDeadline === true;

  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details ?? '');
  const [size, setSize] = useState<TaskSize | null>(task.size);
  const [criticality, setCriticality] = useState<TaskCriticality | null>(task.criticality);
  const [contexts, setContexts] = useState<TaskContext[]>(() =>
    parseTaskContexts(task.contexts).filter((context): context is TaskContext =>
      (TASK_CONTEXTS as readonly string[]).includes(context),
    ),
  );
  const [deadline, setDeadline] = useState<Date | null>(task.deadline);
  const [answeredNone, setAnsweredNone] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // 9.8 G10: which groups the user has interacted with — an AI guess stays
  // DASHED (unconfirmed) until its group is touched; touching flips it solid.
  type ChipGroup = 'size' | 'contexts' | 'deadline';
  const [touched, setTouched] = useState<ReadonlySet<ChipGroup>>(new Set());
  const markTouched = (group: ChipGroup) =>
    setTouched((previous) => {
      if (previous.has(group)) return previous;
      const next = new Set(previous);
      next.add(group);
      return next;
    });

  const toggleContext = (context: TaskContext) => {
    setContexts((previous) =>
      TASK_CONTEXTS.filter((candidate) =>
        candidate === context ? !previous.includes(candidate) : previous.includes(candidate),
      ),
    );
  };

  const deadlineLabel = deadline
    ? deadline.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    : answeredNone
      ? 'No deadline'
      : null;

  // 9.8 G1 save gate: a size always; the deadline question only when it was
  // flagged "nothing to go on" (elsewhere None is available but optional).
  const deadlineAnswered = deadline !== null || answeredNone || !missingDeadline;
  const canSave = size !== null && deadlineAnswered;

  /** Blueprint chip (9.8 G10 semantics): DASHED = selected because the AI
   *  guessed it and the user hasn't confirmed; SOLID bright = the user's own
   *  answer (scratch pick, or a guess confirmed by tapping it); unselected =
   *  faint solid outline. `confirmed` = !guessed-or-touched. */
  const chip = (
    label: string,
    accessibilityLabel: string,
    selected: boolean,
    confirmed: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-label={accessibilityLabel}
      onPress={onPress}
      className="rounded-full px-3.5 py-[7px]"
      style={
        selected
          ? confirmed
            ? {
                backgroundColor: 'rgba(160,200,245,0.16)',
                borderWidth: 1.5,
                borderColor: 'rgba(160,200,245,0.7)',
              }
            : {
                backgroundColor: 'rgba(160,200,245,0.16)',
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: INK_MID,
              }
          : {
              borderWidth: 1.5,
              borderColor: 'rgba(160,200,245,0.3)',
            }
      }
    >
      <Text
        className="font-body-semibold text-sm"
        style={{ color: selected ? INK_BRIGHT : INK_MID }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const groupLabel = (label: string, tag: 'guessed' | 'nothing' | null) => (
    <HStack className="items-center justify-between">
      <Text className="font-mono text-xs uppercase tracking-caps" style={{ color: INK_LABEL }}>
        {label}
      </Text>
      {tag ? (
        <Text
          className="font-mono text-xs uppercase tracking-caps"
          style={{ color: tag === 'guessed' ? INK_MID : 'rgba(160,200,245,0.55)' }}
        >
          {tag === 'guessed' ? 'We guessed' : 'Nothing to go on'}
        </Text>
      ) : null}
    </HStack>
  );

  return (
    <Box className="relative w-full max-w-[336px] self-center">
      {/* Two dashed fan cards behind (translate 20/40, scale .95/.9). */}
      {[2, 1].map((depth) => (
        <Box
          key={depth}
          pointerEvents="none"
          className="absolute inset-0 rounded-[22px]"
          style={{
            transform: [{ translateY: depth * 20 }, { scale: 1 - depth * 0.05 }],
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: `rgba(160,200,245,${0.35 - depth * 0.1})`,
          }}
        />
      ))}
      <VStack
        className="gap-4 rounded-[22px] p-5"
        style={{
          backgroundColor: '#1E3450',
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: 'rgba(160,200,245,0.55)',
        }}
      >
        <HStack className="items-start gap-3">
          <TextInput
            aria-label="Task title"
            value={title}
            onChangeText={setTitle}
            multiline
            returnKeyType="done"
            blurOnSubmit
            className="min-w-0 flex-1 font-heading text-2xl leading-[29px]"
            style={{ color: INK_BRIGHT, padding: 0 }}
          />
          <HStack className="flex-none items-baseline gap-[2px] pt-1">
            <Text className="font-mono text-lg" style={{ color: INK_MID }}>
              {taskValue({ ...task, size })}
            </Text>
            <Text className="text-xs" style={{ color: INK_MID }}>
              ★
            </Text>
          </HStack>
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              aria-label={`Delete from triage: ${task.title}`}
              hitSlop={8}
              onPress={onDelete}
              className="h-8 w-8 flex-none items-center justify-center rounded-full pt-1"
            >
              <Icon as={TrashIcon} size="sm" style={{ color: INK_LABEL }} />
            </Pressable>
          ) : null}
        </HStack>
        <VStack className="gap-1.5">
          {groupLabel('Details', null)}
          <TextInput
            aria-label="Task details"
            value={details}
            onChangeText={setDetails}
            placeholder="Add details"
            placeholderTextColor="rgba(160,200,245,0.45)"
            multiline
            className="min-h-[44px] rounded-[12px] px-3 py-2 font-body text-sm"
            style={{ color: INK_BRIGHT, backgroundColor: 'rgba(160,200,245,0.08)' }}
          />
        </VStack>
        <VStack className="gap-2">
          {groupLabel('Size', inferred.includes('size') ? 'guessed' : null)}
          <HStack className="gap-2">
            {TASK_SIZES.map((candidate) =>
              chip(
                SIZE_LABELS[candidate],
                `Size: ${SIZE_LABELS[candidate]}`,
                size === candidate,
                !inferred.includes('size') || touched.has('size'),
                () => {
                  // First tap on a still-dashed guess CONFIRMS it (solid);
                  // after that, taps toggle as normal (G10).
                  const confirmingGuess =
                    inferred.includes('size') && size === candidate && !touched.has('size');
                  markTouched('size');
                  if (confirmingGuess) return;
                  setSize((previous) => (previous === candidate ? null : candidate));
                },
              ),
            )}
          </HStack>
        </VStack>
        <VStack className="gap-2">
          {/* 9-5 item 15: criticality — never AI-guessed, always the user's call. */}
          {groupLabel('How critical?', null)}
          <HStack className="flex-wrap gap-2">
            {TASK_CRITICALITIES.map((candidate) =>
              chip(
                CRITICALITY_LABELS[candidate],
                `Criticality: ${CRITICALITY_LABELS[candidate]}`,
                (criticality ?? 'chill') === candidate,
                true,
                () => setCriticality((previous) => (previous === candidate ? null : candidate)),
              ),
            )}
          </HStack>
        </VStack>
        <VStack className="gap-2">
          {groupLabel('Requires', inferred.includes('contexts') ? 'guessed' : null)}
          <HStack className="flex-wrap gap-2">
            {TASK_CONTEXTS.map((candidate) =>
              chip(
                CONTEXT_LABELS[candidate],
                `Context: ${CONTEXT_LABELS[candidate]}`,
                contexts.includes(candidate),
                !inferred.includes('contexts') || touched.has('contexts'),
                () => {
                  const confirmingGuess =
                    inferred.includes('contexts') &&
                    contexts.includes(candidate) &&
                    !touched.has('contexts');
                  markTouched('contexts');
                  if (confirmingGuess) return;
                  toggleContext(candidate);
                },
              ),
            )}
          </HStack>
        </VStack>
        <VStack className="gap-2">
          {groupLabel(
            'Deadline',
            inferred.includes('deadline')
              ? 'guessed'
              : missingDeadline && !deadline && !answeredNone
                ? 'nothing'
                : null,
          )}
          <HStack className="flex-wrap items-center gap-2">
            {deadlineLabel
              ? chip(
                  deadlineLabel,
                  `Deadline: ${deadlineLabel}`,
                  true,
                  !inferred.includes('deadline') || touched.has('deadline'),
                  () => {
                    // First tap on a dashed guessed date CONFIRMS it (G10);
                    // changing it is the Pick-a-date chip's job.
                    if (inferred.includes('deadline') && !touched.has('deadline')) {
                      markTouched('deadline');
                      return;
                    }
                    setShowPicker(true);
                  },
                )
              : null}
            {chip('Pick a date', 'Pick a deadline date', false, true, () => setShowPicker(true))}
            {deadline
              ? null
              : chip('None', 'No deadline needed', answeredNone, true, () => {
                  markTouched('deadline');
                  setAnsweredNone(true);
                  setDeadline(null);
                })}
          </HStack>
          {showPicker ? (
            <DateTimePicker
              value={deadline ?? new Date()}
              mode="date"
              // Triage-blue theming (9-5 item 9): Android's dialog chrome
              // follows the native theme; the per-instance levers are the
              // dialog buttons (Android) and the accent (iOS) — both take
              // the blueprint teal/ink so the picker reads as triage's own.
              accentColor="#49BAB9"
              positiveButton={{ textColor: '#49BAB9' }}
              negativeButton={{ textColor: '#8FB4E0' }}
              onChange={(event, picked) => {
                setShowPicker(false);
                if (event.type === 'set' && picked) {
                  const next = new Date(picked);
                  next.setHours(18, 0, 0, 0);
                  setDeadline(next);
                  setAnsweredNone(false);
                  markTouched('deadline');
                }
              }}
            />
          ) : null}
        </VStack>
        <VStack className="gap-2 pt-1">
          {/* 9.8 G1: triage means ANSWERING — a size, and (when there was
              nothing to go on) a date or an explicit None. Skip stays free:
              the card just remains triageable. */}
          {canSave ? null : (
            <Text
              accessibilityLiveRegion="polite"
              className="text-center font-body text-sm"
              style={{ color: INK_MID }}
            >
              {size === null && !deadlineAnswered
                ? 'Pick a size and settle the deadline to save'
                : size === null
                  ? 'Pick a size to save'
                  : 'Pick a date — or None — to save'}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            aria-label="Save and next"
            disabled={!canSave}
            onPress={() =>
              onSave({ title, details, size, criticality, contexts, deadline, answeredNone })
            }
            className="h-[54px] flex-row items-center justify-center gap-[9px] rounded-full disabled:opacity-40"
            style={{ backgroundColor: '#49BAB9' }}
          >
            <Icon as={CheckIcon} size="md" className="text-typography-0" />
            <Text className="font-body-bold text-base text-typography-0">Save and next</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            aria-label="Skip this one"
            onPress={onSkip}
            className="h-10 items-center justify-center rounded-full"
          >
            <Text className="font-body-bold text-sm" style={{ color: INK_LABEL }}>
              Skip this one
            </Text>
          </Pressable>
        </VStack>
      </VStack>
    </Box>
  );
}
