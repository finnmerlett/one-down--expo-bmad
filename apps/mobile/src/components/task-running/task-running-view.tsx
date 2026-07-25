import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import type { SubtaskData, TaskData } from '@one-down/shared';

import { SparkleBadge } from '@/components/premium/sparkle-badge';
import { BreakdownProposal } from '@/components/task-running/breakdown-proposal';
import { SubtaskList } from '@/components/task-running/subtask-list';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import type { BreakdownController } from '@/hooks/use-breakdown';
import type { UpdateTaskPatch } from '@/services/tasks-repository';

export interface TaskRunningViewHandle {
  /** Persist any in-flight notes draft (called before the route pops). */
  flush: () => void;
}

/**
 * Trailing debounce for the while-typing autosave (Story 2.2, FR22): pausing
 * typing for this window writes the notes to SQLite — no blur, no save button.
 * Notes survive a process kill even when the field was never left.
 */
export const NOTES_AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * Task running screen body (UX-DR 6): title + description for focus, an
 * editable notes area for working thoughts (draft/blur/flush auto-save like
 * the card back, PLUS a while-typing debounced autosave — Story 2.2), and the
 * action row. Done completes the task (Story 2.3); Cut loose releases it
 * guilt-free (Story 2.4); only "Help me with this" stays a disabled
 * placeholder (Epic 6).
 */
export function TaskRunningView({
  task,
  onPatch,
  onDone,
  onCutLoose,
  subtasks,
  onToggleSubtask,
  onDeleteSubtask,
  breakdown,
  onHelp,
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onDone?: () => void;
  onCutLoose?: () => void;
  /** Saved subtasks (Story 6.3). Omitted/empty = no list rendered. */
  subtasks?: SubtaskData[];
  onToggleSubtask?: (subtask: SubtaskData) => void;
  onDeleteSubtask?: (subtask: SubtaskData) => void;
  /** Breakdown controller (Story 6.3). Omitted = "Help me with this" stays a disabled placeholder. */
  breakdown?: BreakdownController;
  /** "Help me with this" press — requests a first_steps breakdown. */
  onHelp?: () => void;
  ref?: Ref<TaskRunningViewHandle>;
}) {
  // Draft-or-stored: null draft = not editing, the field follows the DB.
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  // Catch-up drop on RAW equality only (Story 2.2): with mid-session debounced
  // writes landing via the live query, dropping the draft on ANY stored change
  // would lose keystrokes typed after the debounce fired, and the stored trim
  // would visibly eat trailing whitespace mid-sentence. The draft drops only
  // once the stored value renders exactly what the user typed; a draft with
  // trailing whitespace simply stays a live draft (harmless — every persist
  // path is change-gated). Deliberate consequence: an external writer changing
  // notes mid-edit does NOT clobber the active draft — the active editor wins.
  // Single-writer semantics until Epic 6 adds concurrent writers (revisit then).
  useEffect(() => {
    if (notesDraft !== null && notesDraft === (task.notes ?? '')) {
      setNotesDraft(null);
    }
  }, [task.notes, notesDraft]);

  const notes = notesDraft ?? task.notes ?? '';

  // The change gate must compare against the LATEST stored value, not the
  // render-time task.notes the debounce timer closed over: the user's own
  // in-flight write can land between keystroke and timer fire, leaving the
  // closure baseline stale (a duplicate write on flush, or a revert-to-stored
  // edit wrongly gated as "unchanged" while the DB holds the deleted text).
  // Bumped optimistically on every write; re-synced when the live query emits.
  const storedNotesRef = useRef<string | null>(task.notes ?? null);
  useEffect(() => {
    storedNotesRef.current = task.notes ?? null;
  }, [task.notes]);

  // Change-gated persist shared by the debounce tick and blur/flush: normalize
  // like the repository does (trim, '' → null) and write only when the result
  // differs from the stored value (no spurious updatedAt bumps — AC4).
  const persistNotes = (draft: string) => {
    const trimmed = draft.trim();
    const next = trimmed ? trimmed : null;
    if (next === storedNotesRef.current) return;
    storedNotesRef.current = next;
    onPatch({ notes: next });
  };

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutosaveTimer = () => {
    if (autosaveTimer.current !== null) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  };
  // By unmount time the draft has already been flushed via beforeRemove — the
  // pending timer just needs dropping so it can't fire into a dead component.
  useEffect(() => clearAutosaveTimer, []);

  const handleNotesChange = (text: string) => {
    setNotesDraft(text);
    clearAutosaveTimer();
    autosaveTimer.current = setTimeout(() => {
      autosaveTimer.current = null;
      persistNotes(text);
    }, NOTES_AUTOSAVE_DEBOUNCE_MS);
  };

  // Blur + imperative flush: cancel any pending debounce FIRST so a stale
  // timer can never fire a duplicate/out-of-order write after the flush (AC2).
  const flushNotes = () => {
    clearAutosaveTimer();
    if (notesDraft === null) return;
    persistNotes(notesDraft);
  };

  useImperativeHandle(ref, () => ({ flush: flushNotes }));

  // Flush-then-act (2.1 handleStart pattern): the in-flight notes draft must
  // be persisted BEFORE the terminal action is reported — tapping Done (or
  // Cut loose, whose task keeps its notes for the Epic 7 restore) with the
  // keyboard up must not lose the typed note (2.3 AC4 / 2.4 AC4).
  const handleDone = () => {
    flushNotes();
    onDone?.();
  };

  const handleCutLoose = () => {
    flushNotes();
    onCutLoose?.();
  };

  return (
    // Edge-to-edge Android never resizes for the keyboard — explicit padding
    // keeps the notes field reachable while editing (same as the card back).
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow">
        <VStack className="flex-1 gap-5 px-6 pb-6 pt-2">
          <Text className="font-heading text-3xl leading-10 text-typography-900">{task.title}</Text>
          {task.details ? (
            <Text className="font-body text-base text-typography-600">{task.details}</Text>
          ) : null}
          {/* Subtask area (Story 6.3, UX-DR6/7): the saved list, and/or the
              in-flight proposal — loading occupies only this slot (UX-DR20). */}
          {subtasks && subtasks.length > 0 ? (
            <SubtaskList
              subtasks={subtasks}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
              // Flush the notes draft BEFORE refining (Story 6.4): the
              // distillation appends to the STORED notes, so an unflushed
              // draft would otherwise be the write that gets appended over.
              onRefine={
                breakdown
                  ? (feedback) => {
                      flushNotes();
                      breakdown.refine(feedback);
                    }
                  : undefined
              }
              refineDisabled={breakdown?.state === 'loading'}
            />
          ) : null}
          {breakdown && breakdown.state !== 'idle' ? (
            <BreakdownProposal
              state={breakdown.state}
              steps={breakdown.steps}
              mode={breakdown.mode}
              heading={breakdown.via === 'refine' ? 'Refined steps' : undefined}
              loadingLabel={breakdown.via === 'refine' ? 'Rethinking the steps...' : undefined}
              onAccept={breakdown.accept}
              // A refined proposal has no deeper list to expand into.
              onShowAll={
                breakdown.via === 'initial'
                  ? () => breakdown.request('full', 'task_running')
                  : undefined
              }
              onReject={breakdown.reject}
              onRetry={breakdown.retry}
            />
          ) : null}
          <VStack className="gap-2">
            <Text className="font-body-bold text-[13px] text-typography-500">Notes</Text>
            <Textarea size="md">
              <TextareaInput
                aria-label="Task notes"
                placeholder="Jot things down as you go"
                value={notes}
                onChangeText={handleNotesChange}
                onBlur={flushNotes}
              />
            </Textarea>
          </VStack>
          <Box className="flex-1" />
          <VStack className="gap-3">
            {/* Primary action — completes the task (Story 2.3). */}
            <Button size="xl" isDisabled={!onDone} onPress={handleDone} aria-label="Done">
              <ButtonText>Done</ButtonText>
            </Button>
            {/* AI breakdown entry (Story 6.3) with the premium discovery
                sparkle beside it (Story 8.2a). Hidden once subtasks exist or
                a proposal is in flight — the subtask area owns the flow then.
                Disabled placeholder when the route doesn't wire onHelp. */}
            {(!subtasks || subtasks.length === 0) && (!breakdown || breakdown.state === 'idle') ? (
              <HStack className="items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  isDisabled={!onHelp}
                  onPress={onHelp}
                  aria-label="Help me with this"
                  className="flex-1"
                >
                  <ButtonText>Help me with this</ButtonText>
                </Button>
                <SparkleBadge feature="ai_breakdown" />
              </HStack>
            ) : null}
            {/* Frictionless release (Story 2.4) — no confirm, no warning color. */}
            <Button
              size="lg"
              variant="outline"
              isDisabled={!onCutLoose}
              onPress={handleCutLoose}
              aria-label="Cut loose"
            >
              <ButtonText>Cut loose</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
