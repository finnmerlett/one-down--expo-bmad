import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView } from 'react-native';

import { MAX_REFINE_FEEDBACK_CHARS, type SubtaskData, type TaskData } from '@one-down/shared';

import { SparkleBadge } from '@/components/premium/sparkle-badge';
import { FadedScrollView } from '@/components/shared/faded-scroll-view';
import { StepsEditor, type StepEditCallbacks } from '@/components/task-running/steps-editor';
import { StepsHeader, SubtaskList } from '@/components/task-running/subtask-list';
import { Box } from '@/components/ui/box';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Icon,
  RepeatIcon,
} from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import { EDITABLE_BODY_SIZE } from '@/constants/typography';

import type { StepActionsController } from '@/hooks/use-step-actions';
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

/** 9.8 G5 — the notes box's 4-line waterline: text-sm line height (14 ×
 *  UI_SCALE 1.15 × 1.36 ≈ 22) × 4 + the input's p-3 (12 × 2). */
const NOTES_FOUR_LINES = 4 * 22 + 24;

/**
 * Working screen body (v1.5 spec §5): Gabarito title + description stay put,
 * graded steps, the AI step actions (D4), NOTES field, and the two terminal
 * actions — a filled 54px `Mark as complete` and plain-text `Cut it loose`.
 *
 * Step actions (05b–05e): `Change these` opens a dashed WHAT SHOULD BE
 * DIFFERENT box and itself becomes the filled submit (with a check) while
 * `Get more steps` dims to 32% — one live action. Submitting shows a spinner
 * + `Working` in the pressed button and fades the rows; results land
 * DIRECTLY (no proposal), reported on the STEPS label line with Undo.
 *
 * Keyboard choreography (frame 05f): the notes field is the one thing you
 * must see while typing, so when IT focuses the step list becomes its own
 * soft-clipped scroll area and gives up the room; the title and description
 * never move; the terminal buttons pass below the fold. Everywhere else the
 * keyboard overlays without relayout.
 */
export function TaskRunningView({
  task,
  onPatch,
  onDone,
  onCutLoose,
  subtasks,
  onToggleSubtask,
  stepActions,
  stepEdits,
  ref,
}: {
  task: TaskData;
  onPatch: (patch: UpdateTaskPatch) => void;
  onDone?: () => void;
  onCutLoose?: () => void;
  /** Saved subtasks (Story 6.3). Omitted/empty = no list rendered. */
  subtasks?: SubtaskData[];
  onToggleSubtask?: (subtask: SubtaskData) => void;
  /** D4 step actions controller. Omitted = the AI action row stays hidden. */
  stepActions?: StepActionsController;
  /** D4 edit-mode persistence. Omitted = no Edit chip. */
  stepEdits?: StepEditCallbacks;
  ref?: Ref<TaskRunningViewHandle>;
}) {
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  // 9-5 item 14: the dashed "What should be different" box has its own
  // keyboard choreography — it must be the element that lands on the
  // keyboard, not the notes box below it.
  const [changeFocused, setChangeFocused] = useState(false);
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

  // 9.8 B2: notes start collapsed — the chevron beside the label expands.
  const [notesOpen, setNotesOpen] = useState(false);

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

  // ── Step actions (D4) ────────────────────────────────────────────────────
  const hasSteps = !!subtasks && subtasks.length > 0;
  const working = stepActions?.state === 'working';
  const changeWorking = working && stepActions?.kind === 'change';
  const moreWorking = working && stepActions?.kind === 'more';

  // ── Steps edit mode (05a/05b) ────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  // A held row freezes the steps scroll so the drag owns the vertical axis.
  const [dragLocked, setDragLocked] = useState(false);
  const enterEditMode = () => {
    // Stale NEW tags/report would talk over the editor — clear on entry.
    stepActions?.clearReport();
    setEditMode(true);
  };
  // Every step deleted while editing → nothing left to edit; fall back out
  // so the zero-steps action row (Get more steps) can return.
  useEffect(() => {
    if (editMode && !hasSteps) setEditMode(false);
  }, [editMode, hasSteps]);

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState('');
  // More/Less (2026-08-11 item 6): collapsed shows a 3-step scroll window,
  // expanded the whole list that fits. Edit mode always gets full height —
  // drag-reordering inside a 3-row porthole would be misery.
  const [stepsExpanded, setStepsExpanded] = useState(false);
  // Close the box only when the submit actually lands (05e) — an error keeps
  // it open with the text intact so Try again means try THAT again.
  const changeSubmittedRef = useRef(false);
  const actionsState = stepActions?.state;
  useEffect(() => {
    if (actionsState === 'idle' && changeSubmittedRef.current) {
      changeSubmittedRef.current = false;
      setChangeOpen(false);
      setChangeText('');
      // Unmounting the (possibly focused) box input makes Android hand
      // focus to the notes field — drop the keyboard instead (on-device).
      Keyboard.dismiss();
    }
  }, [actionsState]);

  const submitChange = () => {
    const trimmed = changeText.trim();
    if (!stepActions || working) return;
    if (!trimmed) {
      setChangeOpen(false);
      return;
    }
    // Flush the notes draft BEFORE changing (6.4 semantics kept): the
    // distillation appends to the STORED notes, so an unflushed draft would
    // otherwise be the write that gets appended over.
    flushNotes();
    changeSubmittedRef.current = true;
    stepActions.changeThese(trimmed);
  };

  const handleGetMoreSteps = () => {
    if (!stepActions || working || changeOpen) return;
    flushNotes();
    stepActions.getMoreSteps();
  };

  const choreographed = keyboardUp && notesFocused;
  // 9-5 item 14: while the refine box owns the keyboard, everything below it
  // (notes, spacer, terminal actions) hides so ITS bottom lands on the
  // keyboard — the steps list keeps its natural size instead of being
  // squished by the notes box riding the keyboard padding.
  const changeChoreographed = keyboardUp && changeFocused;

  // Collapsed step window (2026-08-11 item 6): show the current step and one
  // either side, with ellipsis rows marking the hidden rest. Everything above
  // the window is completed by construction ('now' = first incomplete).
  // Expanded / edit / keyboard states always show the whole list.
  const stepList = subtasks ?? [];
  const windowed = !stepsExpanded && !editMode && !choreographed && stepList.length > 3;
  const nowIndex = stepList.findIndex((subtask) => !subtask.completed);
  const windowCenter = nowIndex === -1 ? stepList.length - 1 : nowIndex;
  const windowStart = windowed ? Math.min(Math.max(windowCenter - 1, 0), stepList.length - 3) : 0;
  const visibleSubtasks = windowed ? stepList.slice(windowStart, windowStart + 3) : stepList;
  const hiddenAbove = windowed ? windowStart : 0;
  const hiddenBelow = windowed ? stepList.length - windowStart - 3 : 0;

  const actionsBlock = stepActions ? (
    <VStack className="flex-none gap-2.5">
      <HStack className="items-center gap-3">
        {hasSteps && stepList.length > 3 ? (
          <Pressable
            accessibilityRole="button"
            aria-label={stepsExpanded ? 'Show fewer steps' : 'Show all steps'}
            onPress={() => setStepsExpanded((expanded) => !expanded)}
            className="h-10 flex-row items-center gap-1 rounded-full px-1 active:opacity-60"
          >
            <Icon
              as={stepsExpanded ? ChevronUpIcon : ChevronDownIcon}
              size="sm"
              className="text-typography-500"
            />
            <Text className="font-body-semibold text-sm text-typography-600">
              {stepsExpanded ? 'Less' : 'All'}
            </Text>
          </Pressable>
        ) : null}
        {hasSteps ? <Box className="flex-1" /> : null}
        {hasSteps ? (
          changeOpen || changeWorking ? (
            <Pressable
              accessibilityRole="button"
              aria-label="Change"
              disabled={changeWorking}
              onPress={submitChange}
              className="h-10 flex-row items-center justify-center gap-[7px] rounded-full bg-primary-500 px-[17px] active:bg-primary-600"
            >
              {changeWorking ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="font-body-bold text-sm text-typography-0">Working</Text>
                </>
              ) : (
                <>
                  <Icon as={CheckIcon} size="sm" className="text-typography-0" />
                  <Text className="font-body-bold text-sm text-typography-0">Change</Text>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              aria-label="Change"
              disabled={working}
              onPress={() => setChangeOpen(true)}
              className="h-10 flex-row items-center gap-[7px] rounded-full px-1 active:opacity-60"
            >
              <Icon as={RepeatIcon} size="sm" className="text-typography-500" />
              <Text className="font-body-semibold text-sm text-typography-600">Change</Text>
            </Pressable>
          )
        ) : null}
        <Box className="flex-1" />
        {/* 9.8 B3: with no steps yet the same action reads as the first ask. */}
        <Pressable
          accessibilityRole="button"
          aria-label={hasSteps ? 'More steps' : 'Get first steps'}
          disabled={working || changeOpen}
          onPress={handleGetMoreSteps}
          className={`h-10 flex-row items-center justify-center gap-[7px] rounded-full bg-primary-500 px-[18px] active:bg-primary-600 ${
            changeOpen && !changeWorking ? 'opacity-[0.32]' : ''
          }`}
        >
          {moreWorking ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="font-body-bold text-sm text-typography-0">Working</Text>
            </>
          ) : (
            <>
              <Text className="font-body-bold text-sm text-typography-0">
                {hasSteps ? 'More steps' : 'Get first steps'}
              </Text>
              <Icon as={ArrowRightIcon} size="sm" className="text-typography-0" />
            </>
          )}
        </Pressable>
        <SparkleBadge feature="ai_breakdown" />
      </HStack>
      {changeOpen ? (
        <VStack className="gap-2 rounded-[15px] border-[1.5px] border-dashed border-primary-300 bg-background-0 px-[15px] py-3">
          <Text className="font-mono text-xs uppercase tracking-caps text-primary-600">
            What should be different
          </Text>
          {/* Static className only — swapping a gluestack compound component's
              classes per-render tripped the css-interop style context (D3). */}
          <Textarea size="sm" className="min-h-12 border-0 bg-transparent p-0">
            <TextareaInput
              aria-label="What should be different"
              placeholder="Say what's off in your own words"
              value={changeText}
              onChangeText={setChangeText}
              onFocus={() => setChangeFocused(true)}
              onBlur={() => setChangeFocused(false)}
              editable={!changeWorking}
              maxLength={MAX_REFINE_FEEDBACK_CHARS}
              className="px-0"
            />
          </Textarea>
        </VStack>
      ) : null}
      {stepActions.state === 'error' ? (
        <HStack className="items-center gap-2">
          <Text className="font-body text-sm text-typography-500">
            {stepActions.errorReason === 'network'
              ? "That didn't go through — check your connection."
              : "That didn't work this time."}
          </Text>
          <Pressable
            accessibilityRole="button"
            aria-label="Try again"
            hitSlop={6}
            onPress={stepActions.retry}
          >
            <Text className="font-body-semibold text-sm text-primary-700">Try again</Text>
          </Pressable>
        </HStack>
      ) : null}
    </VStack>
  ) : null;

  // Frame 05f: the choreography applies only while the NOTES field owns the
  // keyboard — the step list is what gives up the room.

  const titleBlock = (
    <VStack className="flex-none gap-[9px]">
      <Text className="font-heading text-3xl leading-[33px] tracking-tight text-typography-900">
        {task.title}
      </Text>
      {task.details ? (
        <Text className="font-body text-sm leading-[22px] text-typography-600">{task.details}</Text>
      ) : null}
    </VStack>
  );

  const stepsBlock = hasSteps ? (
    editMode && stepEdits ? (
      <StepsEditor
        subtasks={subtasks}
        edits={stepEdits}
        onDone={() => setEditMode(false)}
        onDraggingChange={setDragLocked}
      />
    ) : (
      <SubtaskList
        subtasks={visibleSubtasks}
        hiddenAbove={hiddenAbove}
        hiddenBelow={hiddenBelow}
        taskSize={task.size}
        onToggle={onToggleSubtask}
        report={stepActions?.report ?? null}
        onUndo={stepActions?.undo}
        onEditSteps={stepEdits && !working ? enterEditMode : undefined}
        faded={working}
        // 9.8 G15: the header is pinned OUTSIDE the scroll area below.
        showHeader={false}
      />
    )
  ) : null;

  // Collapse must not eat an in-flight draft: drop the keyboard first (an
  // unmounting focused TextInput hands focus onward on Android), then flush.
  const toggleNotesOpen = () => {
    if (notesOpen) {
      Keyboard.dismiss();
      flushNotes();
    }
    setNotesOpen((open) => !open);
  };

  const notesBlock = (
    <VStack className="flex-none gap-[7px]">
      {/* 9.8 B2: the whole label row toggles; chevron sits next to the word. */}
      <Pressable
        accessibilityRole="button"
        aria-label={notesOpen ? 'Collapse notes' : 'Expand notes'}
        hitSlop={8}
        onPress={toggleNotesOpen}
        className="flex-row items-center gap-1 self-start active:opacity-60"
      >
        <Text className="font-mono text-xs uppercase tracking-caps text-typography-400">Notes</Text>
        <Icon
          as={notesOpen ? ChevronUpIcon : ChevronDownIcon}
          size="sm"
          className="text-typography-400"
        />
      </Pressable>
      {/* Static className only — swapping a gluestack compound component's
          classes per-render tripped the css-interop style context on device
          (D3); the component's own data-[focus] variant draws the ring.
          9.8 B1: the box grows with its content (h-auto beats the base
          h-[100px]); past ~6 lines the input scrolls inside its max height. */}
      {notesOpen ? (
        <Textarea
          size={EDITABLE_BODY_SIZE}
          className="h-auto min-h-14 rounded-[15px] border-outline-100 bg-background-0"
        >
          {/* 9.8 G5 (heights via style — className must stay static): while
              focused the box holds at least 4 lines and keeps growing with
              the text; unfocused it clamps back to 4 lines and scrolls. */}
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
            multiline
            className="flex-none"
            style={notesFocused ? { minHeight: NOTES_FOUR_LINES } : { maxHeight: NOTES_FOUR_LINES }}
          />
        </Textarea>
      ) : null}
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
      {/* pb-0 (9.8 G6): the terminal pills sit a line above the screen
          bottom — the safe-area inset alone is the gap. */}
      <VStack className="flex-1 gap-4 px-6 pb-0 pt-2">
        {titleBlock}
        {/* 9.8 G15: the STEPS label line sits OUTSIDE the scroll area — only
            the rows scroll under it. */}
        {hasSteps && !editMode ? (
          <StepsHeader
            report={stepActions?.report ?? null}
            onUndo={stepActions?.undo}
            onEditSteps={stepEdits && !working ? enterEditMode : undefined}
          />
        ) : null}
        {/* Steps live in their own scroll area at ALL times: sized to
            content normally, stretched to fill while the notes field owns
            the keyboard (05f) — the list is what gives up the room. */}
        {/* Scroll-aware soft edges (item 4): fades only when content is
            actually hidden past an edge. Collapsed windows fit → no fades. */}
        {/* G15: -mr-3 reclaims a slice of the screen's right padding and
            hands it to the content as pr-3, so the scrollbar rides in its
            own gutter instead of over the rows. */}
        <FadedScrollView
          containerClassName={choreographed ? '-mr-3 min-h-0 flex-1' : '-mr-3 min-h-0 shrink'}
          contentContainerStyle={{ paddingRight: 12 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!dragLocked}
        >
          {stepsBlock}
        </FadedScrollView>
        {/* The AI action row sits between steps and notes (05b) — hidden
            while the notes field owns the keyboard (like the terminal) and
            while the editor owns the list. While the CHANGE box owns the
            keyboard (item 14), a spacer above pins its bottom to the
            keyboard; the slot stays positional so the box never remounts
            mid-focus (D3). */}
        {choreographed || editMode ? null : (
          <>
            {changeChoreographed ? <Box className="flex-1" /> : null}
            {actionsBlock}
          </>
        )}
        {/* Edit mode recedes everything below the list to 62% (05a) — and
            makes it inert so a mistap can't complete the task mid-edit.
            Hidden entirely while the change box owns the keyboard (item 14):
            the notes box was what used to land on the keyboard instead. */}
        {changeChoreographed ? null : (
          <Box
            className={editMode ? 'opacity-[0.62]' : ''}
            pointerEvents={editMode ? 'none' : 'auto'}
          >
            {notesBlock}
          </Box>
        )}
        {choreographed || changeChoreographed ? null : (
          <>
            <Box className="flex-1" />
            <VStack
              className={editMode ? 'gap-2.5 pt-2 opacity-[0.62]' : 'gap-2.5 pt-2'}
              pointerEvents={editMode ? 'none' : 'auto'}
            >
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
