import { useImperativeHandle, useState, type Ref } from 'react';
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
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onClose: () => void;
  ref?: Ref<CardBackHandle>;
}) {
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details ?? '');
  const [notes, setNotes] = useState(task.notes ?? '');

  const flushTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      // Titles can't be blanked — revert the draft to the stored value.
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) {
      onPatch({ title: trimmed });
    }
  };

  const flushDetails = () => {
    const trimmed = details.trim();
    if (trimmed !== (task.details ?? '')) {
      onPatch({ details: trimmed ? trimmed : null });
    }
  };

  const flushNotes = () => {
    const trimmed = notes.trim();
    if (trimmed !== (task.notes ?? '')) {
      onPatch({ notes: trimmed ? trimmed : null });
    }
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
          aria-label="Back to card front"
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
                onChangeText={setTitle}
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
                  onChangeText={setDetails}
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
                  onChangeText={setNotes}
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
            {/* Wired in Epic 2 (Start → task running, Cut Loose → release). */}
            <HStack className="gap-3 pt-2">
              <Button size="lg" className="flex-1" isDisabled aria-label="Start task">
                <ButtonText>Start</ButtonText>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                isDisabled
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
