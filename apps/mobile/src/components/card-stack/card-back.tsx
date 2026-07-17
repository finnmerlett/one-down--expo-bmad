import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import {
  parseTaskContexts,
  TASK_CONTEXTS,
  TASK_SIZES,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import type { UpdateTaskPatch } from '@/services/tasks-repository';
import { CONTEXT_LABELS, SIZE_LABELS } from './task-card';

export interface CardBackHandle {
  /** Persist any in-flight text edits (called before the card contracts). */
  flush: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-sm font-medium text-typography-500">{children}</Text>;
}

function Chip({
  label,
  accessibilityLabel,
  selected,
  onPress,
  role = 'button',
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
  /** Context toggles are switches (checked); the size selector is buttons (selected). */
  role?: 'button' | 'switch';
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'switch' ? { checked: selected } : { selected }}
      aria-label={accessibilityLabel}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-primary-700 bg-primary-600' : 'border-outline-300 bg-background-0'
      }`}
    >
      <Text
        className={
          selected ? 'text-sm font-medium text-typography-0' : 'text-sm text-typography-700'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Card back: full task details with inline editing (UX: tap text, edit in
 * place, auto-save on blur — no save button). Text fields hold local drafts
 * and emit a patch only when the value actually changed; toggles and the size
 * selector persist immediately. `flush()` (imperative handle) saves pending
 * drafts when the card is closed with the keyboard still up — blur events are
 * not guaranteed on unmount.
 */
export function CardBack({
  task,
  onPatch,
  onClose,
  onStart,
  onCutLoose,
  backLabel = 'Back to card front',
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onClose: () => void;
  /** Start/Continue → task running screen (Story 2.1). Omitted = disabled. */
  onStart?: () => void;
  /** Cut loose → guilt-free archive (Story 2.4). Omitted = disabled. */
  onCutLoose?: () => void;
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
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  useEffect(() => setTitleDraft(null), [task.title]);
  useEffect(() => setDetailsDraft(null), [task.details]);
  useEffect(() => setNotesDraft(null), [task.notes]);

  const title = titleDraft ?? task.title;
  const details = detailsDraft ?? task.details ?? '';
  const notes = notesDraft ?? task.notes ?? '';

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

  const flushNotes = () => {
    if (notesDraft === null) return;
    const trimmed = notesDraft.trim();
    const next = trimmed ? trimmed : null;
    if (next === (task.notes ?? null)) {
      setNotesDraft(null);
      return;
    }
    onPatch({ notes: next });
  };

  useImperativeHandle(ref, () => ({
    flush: () => {
      flushTitle();
      flushDetails();
      flushNotes();
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
    // Tapping the selected size again clears it back to unset.
    onPatch({ size: task.size === size ? null : size });
  };

  // In-flight text drafts must persist before leaving for the running screen
  // — navigation, like overlay dismissal, gives no blur guarantee.
  const handleStart = () => {
    flushTitle();
    flushDetails();
    flushNotes();
    onStart?.();
  };

  // Flush-then-act (Story 2.4, AC4): released tasks keep their latest text
  // for the Epic 7 recycle bin restore — persist drafts BEFORE reporting.
  const handleCutLoose = () => {
    flushTitle();
    flushDetails();
    flushNotes();
    onCutLoose?.();
  };

  const startLabel = task.status === 'in_progress' ? 'Continue' : 'Start';

  const deadlineLabel = task.deadline
    ? task.deadline.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'No deadline';

  return (
    <Box className="h-full w-full overflow-hidden rounded-3xl border border-outline-200 bg-background-0 shadow-hard-2">
      <HStack className="items-center px-3 pt-3">
        <Pressable
          accessibilityRole="button"
          aria-label={backLabel}
          hitSlop={8}
          onPress={onClose}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Icon as={ArrowLeftIcon} size="lg" className="text-typography-700" />
        </Pressable>
      </HStack>
      {/* Edge-to-edge Android never resizes for the keyboard (same as the
          quick-add sheet) — explicit padding keeps the lower fields (notes,
          contexts) reachable while editing. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        {/* persistTaps: a toggle tap with the keyboard up must both blur
            (save) and register, not just dismiss the keyboard. */}
        <ScrollView keyboardShouldPersistTaps="handled">
          <VStack className="gap-5 px-6 pb-6 pt-1">
            <Input size="lg" variant="underlined">
              <InputField
                aria-label="Task title"
                placeholder="What needs doing?"
                value={title}
                onChangeText={setTitleDraft}
                onBlur={flushTitle}
                className="text-2xl font-semibold text-typography-900"
              />
            </Input>
            <VStack className="gap-2">
              <SectionLabel>Details</SectionLabel>
              <Textarea size="md">
                <TextareaInput
                  aria-label="Task details"
                  placeholder="Add details"
                  value={details}
                  onChangeText={setDetailsDraft}
                  onBlur={flushDetails}
                />
              </Textarea>
            </VStack>
            <VStack className="gap-1">
              <SectionLabel>Deadline</SectionLabel>
              {/* Display-only for now — deadline editing arrives with triage (Epic 6). */}
              <Text className="text-typography-900">{deadlineLabel}</Text>
            </VStack>
            <VStack className="gap-2">
              <SectionLabel>Notes</SectionLabel>
              <Textarea size="md">
                <TextareaInput
                  aria-label="Task notes"
                  placeholder="Notes to self"
                  value={notes}
                  onChangeText={setNotesDraft}
                  onBlur={flushNotes}
                />
              </Textarea>
            </VStack>
            <VStack className="gap-2">
              <SectionLabel>Contexts</SectionLabel>
              <HStack className="flex-wrap gap-2">
                {TASK_CONTEXTS.map((context) => (
                  <Chip
                    key={context}
                    label={CONTEXT_LABELS[context]}
                    accessibilityLabel={`Context: ${CONTEXT_LABELS[context]}`}
                    selected={activeContexts.includes(context)}
                    onPress={() => toggleContext(context)}
                    role="switch"
                  />
                ))}
              </HStack>
            </VStack>
            <VStack className="gap-2">
              <SectionLabel>Size</SectionLabel>
              <HStack className="gap-2">
                {TASK_SIZES.map((size) => (
                  <Chip
                    key={size}
                    label={SIZE_LABELS[size]}
                    accessibilityLabel={`Size: ${SIZE_LABELS[size]}`}
                    selected={task.size === size}
                    onPress={() => selectSize(size)}
                  />
                ))}
              </HStack>
            </VStack>
            {/* Cut loose is deliberately frictionless — no confirm, no warning
                color (zero-guilt release; the recycle bin restore is Epic 7). */}
            <HStack className="gap-3 pt-2">
              <Button
                size="lg"
                className="flex-1"
                isDisabled={!onStart}
                onPress={handleStart}
                aria-label={`${startLabel} task`}
              >
                <ButtonText>{startLabel}</ButtonText>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                isDisabled={!onCutLoose}
                onPress={handleCutLoose}
                aria-label="Cut loose"
              >
                <ButtonText>Cut loose</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
