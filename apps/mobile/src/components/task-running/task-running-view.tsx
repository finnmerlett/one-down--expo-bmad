import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import type { TaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import type { UpdateTaskPatch } from '@/services/tasks-repository';

export interface TaskRunningViewHandle {
  /** Persist any in-flight notes draft (called before the route pops). */
  flush: () => void;
}

/**
 * Task running screen body (UX-DR 6): title + description for focus, an
 * editable notes area for working thoughts (same draft/blur/flush auto-save
 * as the card back), and the action row. Done (Story 2.3), "Help me with
 * this" (Epic 6), and Cut Loose (Story 2.4) are disabled placeholders here —
 * Story 2.1 is about entering and staying in the running state.
 */
export function TaskRunningView({
  task,
  onPatch,
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  ref?: Ref<TaskRunningViewHandle>;
}) {
  // Draft-or-stored, same as the card back: null draft = not editing, the
  // field follows the DB; a stored change drops the draft (own write landing,
  // or a future concurrent writer — Epic 6 AI breakdown — winning).
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  useEffect(() => setNotesDraft(null), [task.notes]);
  const notes = notesDraft ?? task.notes ?? '';

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

  useImperativeHandle(ref, () => ({ flush: flushNotes }));

  return (
    // Edge-to-edge Android never resizes for the keyboard — explicit padding
    // keeps the notes field reachable while editing (same as the card back).
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow">
        <VStack className="flex-1 gap-5 px-6 pb-6 pt-2">
          <Text className="text-3xl font-semibold text-typography-900">{task.title}</Text>
          {task.details ? (
            <Text className="text-base text-typography-600">{task.details}</Text>
          ) : null}
          {/* Subtask list (AI breakdown) lands here in Epic 6. */}
          <VStack className="gap-2">
            <Text className="text-sm font-medium text-typography-500">Notes</Text>
            <Textarea size="md">
              <TextareaInput
                aria-label="Task notes"
                placeholder="Jot things down as you go"
                value={notes}
                onChangeText={setNotesDraft}
                onBlur={flushNotes}
              />
            </Textarea>
          </VStack>
          <Box className="flex-1" />
          <VStack className="gap-3">
            {/* Primary action — completes the task (wired in Story 2.3). */}
            <Button size="xl" isDisabled aria-label="Done">
              <ButtonText>Done</ButtonText>
            </Button>
            {/* AI breakdown placeholder (Epic 6) and Cut Loose (Story 2.4). */}
            <Button size="lg" variant="outline" isDisabled aria-label="Help me with this">
              <ButtonText>Help me with this</ButtonText>
            </Button>
            <Button size="lg" variant="outline" isDisabled aria-label="Cut loose">
              <ButtonText>Cut loose</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
