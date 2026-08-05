import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { SubtaskData, TaskData } from '@one-down/shared';

import { SparkleBadge } from '@/components/premium/sparkle-badge';
import { BreakdownProposal } from '@/components/task-running/breakdown-proposal';
import { SubtaskList } from '@/components/task-running/subtask-list';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { CheckIcon, Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
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

/** Soft-fade scroll clip (saved listClipMode, spec §5): the step list reads
 *  as sliding under an edge rather than ending. Ground-coloured gradient. */
function FadeEdge({ position }: { position: 'top' | 'bottom' }) {
  return (
    <Box
      pointerEvents="none"
      className={`absolute left-0 right-0 ${position === 'top' ? 'top-0' : 'bottom-0'}`}
      style={{ height: 12 }}
    >
      <Svg width="100%" height={12}>
        <Defs>
          <LinearGradient
            id={`fade-${position}`}
            x1="0"
            y1={position === 'top' ? '0' : '1'}
            x2="0"
            y2={position === 'top' ? '1' : '0'}
          >
            <Stop offset="0" stopColor="#F4F6F5" stopOpacity={1} />
            <Stop offset="1" stopColor="#F4F6F5" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={12} fill={`url(#fade-${position})`} />
      </Svg>
    </Box>
  );
}

/**
 * Working screen body (v1.5 spec §5): Gabarito title + description stay put,
 * graded steps, NOTES field, and the two terminal actions — a filled 54px
 * `Mark as complete` and plain-text `Cut it loose`.
 *
 * Keyboard choreography (frame 05f): the notes field is the one thing you
 * must see while typing, so when IT focuses the step list becomes its own
 * soft-clipped scroll area and gives up the room; the title and description
 * never move; the terminal buttons pass below the fold. Everywhere else the
 * keyboard overlays without relayout. Dismiss and the list is exactly where
 * it was.
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
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
  // be persisted BEFORE the terminal action is reported — tapping Mark as
  // complete (or Cut it loose, whose task keeps its notes for the Epic 7
  // restore) with the keyboard up must not lose the typed note.
  const handleDone = () => {
    flushNotes();
    onDone?.();
  };

  const handleCutLoose = () => {
    flushNotes();
    onCutLoose?.();
  };

  // Frame 05f: the choreography applies only while the NOTES field owns the
  // keyboard — the step list is what gives up the room.
  const choreographed = keyboardUp && notesFocused;

  const titleBlock = (
    <VStack className="flex-none gap-[9px]">
      <Text className="font-heading text-[28px] leading-[33px] tracking-tight text-typography-900">
        {task.title}
      </Text>
      {task.details ? (
        <Text className="font-body text-sm leading-[22px] text-typography-600">{task.details}</Text>
      ) : null}
    </VStack>
  );

  const stepsBlock =
    subtasks && subtasks.length > 0 ? (
      <SubtaskList
        subtasks={subtasks}
        taskSize={task.size}
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
    ) : null;

  const proposalBlock =
    breakdown && breakdown.state !== 'idle' ? (
      <BreakdownProposal
        state={breakdown.state}
        steps={breakdown.steps}
        mode={breakdown.mode}
        heading={breakdown.via === 'refine' ? 'Refined steps' : undefined}
        loadingLabel={breakdown.via === 'refine' ? 'Rethinking the steps...' : undefined}
        onAccept={breakdown.accept}
        // A refined proposal has no deeper list to expand into.
        onShowAll={
          breakdown.via === 'initial' ? () => breakdown.request('full', 'task_running') : undefined
        }
        onReject={breakdown.reject}
        onRetry={breakdown.retry}
      />
    ) : null;

  const notesBlock = (
    <VStack className="flex-none gap-[7px]">
      <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-400">
        Notes
      </Text>
      {/* Static className only — swapping a gluestack compound component's
          classes per-render tripped the css-interop style context on device
          (D3); the component's own data-[focus] variant draws the ring. */}
      <Textarea size="md" className="min-h-14 rounded-[15px] border-outline-100 bg-background-0">
        <TextareaInput
          aria-label="Task notes"
          placeholder="Jot things down as you go"
          value={notes}
          onChangeText={handleNotesChange}
          onFocus={() => setNotesFocused(true)}
          onBlur={() => {
            setNotesFocused(false);
            flushNotes();
          }}
        />
      </Textarea>
    </VStack>
  );

  return (
    // Edge-to-edge Android never resizes for the keyboard — explicit padding
    // keeps the notes field reachable while editing (same as the card back).
    //
    // ONE stable tree for both keyboard states: the 05f choreography changes
    // CONSTRAINTS (the steps area stretches, the tail hides), never element
    // identity — a branch swap remounted the Textarea mid-focus on device,
    // dropping the keyboard and eating keystrokes (D3).
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <VStack className="flex-1 gap-4 px-6 pb-3 pt-2">
        {titleBlock}
        {/* Steps live in their own scroll area at ALL times: sized to
            content normally, stretched to fill while the notes field owns
            the keyboard (05f) — the list is what gives up the room. */}
        <Box className={choreographed ? 'min-h-0 flex-1' : 'min-h-0 shrink'}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <VStack className="gap-4">
              {stepsBlock}
              {proposalBlock}
            </VStack>
          </ScrollView>
          {choreographed ? (
            <>
              <FadeEdge position="top" />
              <FadeEdge position="bottom" />
            </>
          ) : null}
        </Box>
        {notesBlock}
        {choreographed ? null : (
          <>
            <Box className="flex-1" />
            <VStack className="gap-2.5 pt-2">
              {/* AI breakdown entry (Story 6.3) with the premium discovery
                  sparkle beside it (Story 8.2a). Hidden once subtasks exist
                  or a proposal is in flight — the subtask area owns the flow
                  then. Disabled placeholder when the route doesn't wire
                  onHelp. D4 replaces this with Get more steps. */}
              {(!subtasks || subtasks.length === 0) &&
              (!breakdown || breakdown.state === 'idle') ? (
                <HStack className="items-center gap-2">
                  <Button
                    size="lg"
                    variant="outline"
                    isDisabled={!onHelp}
                    onPress={onHelp}
                    aria-label="Help me with this"
                    className="flex-1 rounded-[13px]"
                  >
                    <ButtonText>Help me with this</ButtonText>
                  </Button>
                  <SparkleBadge feature="ai_breakdown" />
                </HStack>
              ) : null}
              {/* The ONE terminal action per screen: filled 54px pill with a
                  leading check (glyph-before = action, spec §1). Hidden while
                  the keyboard is up (a mistap here is a terminal action). */}
              {keyboardUp ? null : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    aria-label="Mark as complete"
                    disabled={!onDone}
                    onPress={handleDone}
                    className="h-[54px] flex-row items-center justify-center gap-[9px] rounded-full bg-primary-500 shadow-fab active:bg-primary-600 disabled:opacity-50"
                  >
                    <Icon as={CheckIcon} size="md" className="text-typography-0" />
                    <Text className="font-body-bold text-base text-typography-0">
                      Mark as complete
                    </Text>
                  </Pressable>
                  {/* Frictionless release (Story 2.4) — plain text so it never
                      competes with complete; no confirm, no warning color. */}
                  <Pressable
                    accessibilityRole="button"
                    aria-label="Cut it loose"
                    disabled={!onCutLoose}
                    onPress={handleCutLoose}
                    className="h-11 items-center justify-center rounded-full active:bg-background-200"
                  >
                    <Text className="font-body-bold text-sm text-typography-500">Cut it loose</Text>
                  </Pressable>
                </>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </KeyboardAvoidingView>
  );
}
