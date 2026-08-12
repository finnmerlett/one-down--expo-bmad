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
import { CheckIcon, Icon } from '@/components/ui/icon';
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
}: {
  task: TaskData;
  onSave: (draft: BlueprintDraft) => void;
  onSkip: () => void;
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

  /** Dashed blueprint chip; guessed+selected renders solid-ish (spec §9). */
  const chip = (
    label: string,
    accessibilityLabel: string,
    selected: boolean,
    guessed: boolean,
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
          ? {
              backgroundColor: 'rgba(160,200,245,0.16)',
              borderWidth: 1.5,
              borderColor: guessed ? INK_MID : 'rgba(160,200,245,0.7)',
            }
          : {
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(160,200,245,0.4)',
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
                inferred.includes('size'),
                () => setSize((previous) => (previous === candidate ? null : candidate)),
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
                false,
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
                inferred.includes('contexts'),
                () => toggleContext(candidate),
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
                  inferred.includes('deadline'),
                  () => setShowPicker(true),
                )
              : null}
            {chip('Pick a date', 'Pick a deadline date', false, false, () => setShowPicker(true))}
            {deadline || !missingDeadline
              ? null
              : chip('None', 'No deadline needed', answeredNone, false, () => {
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
                }
              }}
            />
          ) : null}
        </VStack>
        <VStack className="gap-2 pt-1">
          <Pressable
            accessibilityRole="button"
            aria-label="Save and next"
            onPress={() =>
              onSave({ title, details, size, criticality, contexts, deadline, answeredNone })
            }
            className="h-[54px] flex-row items-center justify-center gap-[9px] rounded-full"
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
