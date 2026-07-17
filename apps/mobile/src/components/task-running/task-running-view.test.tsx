import { createRef } from 'react';
import { composeStories } from '@storybook/react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { makeTask } from '@/components/card-stack/task-card.stories';
import { useEntitlementsStore } from '@/stores/entitlements-store';
import {
  NOTES_AUTOSAVE_DEBOUNCE_MS,
  TaskRunningView,
  type TaskRunningViewHandle,
} from './task-running-view';
import * as taskRunningStories from './task-running-view.stories';

const { WithDetailsAndNotes, Bare } = composeStories(taskRunningStories);

// Task shape backing the WithDetailsAndNotes story — rerendering with a
// changed `notes` simulates a write landing via the live query.
const storyTask = (notes: string | null) =>
  makeTask({
    id: 'task-running-full',
    title: 'Sort out the garage',
    details: 'At least clear a path to the freezer',
    notes,
    status: 'in_progress',
  });

describe('TaskRunningView (portable stories)', () => {
  it('shows title, details, stored notes, and the action row', async () => {
    await render(<WithDetailsAndNotes />);

    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.getByText('At least clear a path to the freezer')).toBeTruthy();
    expect(screen.getByLabelText('Task notes').props.value).toBe('Shelves are up, boxes next');
    // Done is disabled without onDone (Story 2.3); the rest stay inert until
    // their stories land (Epic 6 / 2.4).
    expect(screen.getByLabelText('Done').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByLabelText('Help me with this').props.accessibilityState?.disabled).toBe(
      true,
    );
    expect(screen.getByLabelText('Cut loose').props.accessibilityState?.disabled).toBe(true);
  });

  it('enables Done when onDone is provided (Story 2.3)', async () => {
    await render(<WithDetailsAndNotes onDone={() => {}} />);

    expect(screen.getByLabelText('Done').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('enables Cut loose when onCutLoose is provided (Story 2.4)', async () => {
    await render(<WithDetailsAndNotes onCutLoose={() => {}} />);

    expect(screen.getByLabelText('Cut loose').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('flushes the notes draft BEFORE reporting Cut loose (Story 2.4, AC4)', async () => {
    const onPatch = jest.fn();
    const onCutLoose = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} onCutLoose={onCutLoose} />);

    // Keyboard still up, debounce not yet fired — released tasks keep their
    // latest notes for the Epic 7 recycle bin restore.
    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Keep this for later');
    await fireEvent.press(screen.getByLabelText('Cut loose'));

    expect(onPatch).toHaveBeenCalledWith({ notes: 'Keep this for later' });
    expect(onCutLoose).toHaveBeenCalledTimes(1);
    // The invariant is the ORDER: persist first, then release.
    expect(onPatch.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onCutLoose.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('flushes the notes draft BEFORE reporting Done (Story 2.3, AC4)', async () => {
    const onPatch = jest.fn();
    const onDone = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} onDone={onDone} />);

    // Keyboard still up, debounce not yet fired — tap Done immediately.
    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Final thought');
    await fireEvent.press(screen.getByLabelText('Done'));

    expect(onPatch).toHaveBeenCalledWith({ notes: 'Final thought' });
    expect(onDone).toHaveBeenCalledTimes(1);
    // The invariant is the ORDER: persist first, then complete.
    expect(onPatch.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onDone.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('renders without details and with empty notes', async () => {
    await render(<Bare />);

    expect(screen.getByText('Water the plants')).toBeTruthy();
    expect(screen.getByLabelText('Task notes').props.value).toBe('');
  });

  it('saves changed notes on blur, but not unchanged ones', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);

    const notes = screen.getByLabelText('Task notes');
    await fireEvent(notes, 'blur');
    expect(onPatch).not.toHaveBeenCalled();

    await fireEvent.changeText(notes, '  Boxes done, sweeping next ');
    await fireEvent(notes, 'blur');
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Boxes done, sweeping next' });
  });

  it('clears notes to null when emptied', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);

    const notes = screen.getByLabelText('Task notes');
    await fireEvent.changeText(notes, '   ');
    await fireEvent(notes, 'blur');

    expect(onPatch).toHaveBeenCalledWith({ notes: null });
  });
});

describe('TaskRunningView notes autosave (Story 2.2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // RNTL v14's act ALWAYS returns a thenable — every act call in this file
  // must be awaited, or React abandons the act queue and every later render
  // in the file mounts an empty tree.
  const pause = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('persists the normalized draft after the debounce pause, exactly once (AC1)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);

    await fireEvent.changeText(screen.getByLabelText('Task notes'), '  Boxes done, sweeping next ');
    expect(onPatch).not.toHaveBeenCalled();

    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Boxes done, sweeping next' });

    // Nothing else queued — the timer fired once and is done.
    await pause(10 * NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledTimes(1);
  });

  it('defers while typing continuously and writes only the final text (trailing debounce)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'Boxes');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS - 100);
    await fireEvent.changeText(notes, 'Boxes done');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS - 100);
    expect(onPatch).not.toHaveBeenCalled();

    await pause(100);
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Boxes done' });
  });

  it('flushes immediately on blur and the cancelled timer never double-writes (AC2)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'Halfway through');
    await fireEvent(notes, 'blur');
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Halfway through' });

    // The debounce set by the keystroke was cancelled by the flush — if it
    // were still pending it would fire here and patch a second time.
    await pause(10 * NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending timer on imperative flush (beforeRemove path, AC2)', async () => {
    const onPatch = jest.fn();
    const ref = createRef<TaskRunningViewHandle>();
    await render(
      <TaskRunningView ref={ref} task={storyTask('Shelves are up')} onPatch={onPatch} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Leaving mid-thought');
    await act(async () => {
      ref.current?.flush();
    });
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Leaving mid-thought' });

    await pause(10 * NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate the write when blur lands before the live query re-emits (AC4)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'Fresh thinking');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledTimes(1);

    // Blur fires in the window before useLiveQuery re-emits — task.notes is
    // still the pre-write value, so the gate must compare against the value
    // just written, not the stale rendered prop.
    await fireEvent(notes, 'blur');
    expect(onPatch).toHaveBeenCalledTimes(1);
  });

  it('writes a revert-to-stored edit typed before the live query re-emits (AC1/AC4)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'Changed my mind');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenNthCalledWith(1, { notes: 'Changed my mind' });

    // Before that write re-emits via the live query, the user restores the
    // original stored text. The DB now holds 'Changed my mind' — gating this
    // against the stale rendered task.notes would keep the deleted text.
    await fireEvent.changeText(notes, 'Shelves are up, boxes next');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenNthCalledWith(2, { notes: 'Shelves are up, boxes next' });
  });

  it('writes nothing when the debounce tick equals the stored value (AC4)', async () => {
    const onPatch = jest.fn();
    await render(<WithDetailsAndNotes onPatch={onPatch} />);

    // Trims back to the stored 'Shelves are up, boxes next' — no write.
    await fireEvent.changeText(
      screen.getByLabelText('Task notes'),
      '  Shelves are up, boxes next ',
    );
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);

    expect(onPatch).not.toHaveBeenCalled();
  });

  it('drops the draft when the saved value lands, then follows the DB again (AC5)', async () => {
    const onPatch = jest.fn();
    const view = await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'Fresh thinking');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Fresh thinking' });

    // The debounced write lands via the live query — raw-equal, draft drops.
    await view.rerender(
      <WithDetailsAndNotes onPatch={onPatch} task={storyTask('Fresh thinking')} />,
    );
    expect(screen.getByLabelText('Task notes').props.value).toBe('Fresh thinking');

    // Proof the draft actually dropped: the field follows stored changes again.
    await view.rerender(
      <WithDetailsAndNotes onPatch={onPatch} task={storyTask('Follows the DB now')} />,
    );
    expect(screen.getByLabelText('Task notes').props.value).toBe('Follows the DB now');
  });

  it('never visually trims trailing whitespace while editing (AC5)', async () => {
    const onPatch = jest.fn();
    const view = await render(<WithDetailsAndNotes onPatch={onPatch} />);

    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Fresh thinking ');
    await pause(NOTES_AUTOSAVE_DEBOUNCE_MS);
    expect(onPatch).toHaveBeenCalledWith({ notes: 'Fresh thinking' });

    // The trimmed write lands — NOT raw-equal, so the draft (and the trailing
    // space the user just typed mid-sentence) stays visible.
    await view.rerender(
      <WithDetailsAndNotes onPatch={onPatch} task={storyTask('Fresh thinking')} />,
    );
    expect(screen.getByLabelText('Task notes').props.value).toBe('Fresh thinking ');
  });

  it('keeps the active draft when an external writer changes notes mid-edit (AC5)', async () => {
    const onPatch = jest.fn();
    const view = await render(<WithDetailsAndNotes onPatch={onPatch} />);
    const notes = screen.getByLabelText('Task notes');

    await fireEvent.changeText(notes, 'My live draft');

    // Different stored value lands while the draft is live — the active
    // editor wins (documented single-writer semantics until Epic 6).
    await view.rerender(
      <WithDetailsAndNotes onPatch={onPatch} task={storyTask('Externally written')} />,
    );
    expect(screen.getByLabelText('Task notes').props.value).toBe('My live draft');
  });
});

describe('premium sparkle gating (Story 8.2a)', () => {
  afterEach(() => {
    // Unmount FIRST (jest runs this hook before RNTL's auto-cleanup), so the
    // store reset never updates a still-mounted SparkleBadge outside act().
    cleanup();
    useEntitlementsStore.setState({ isPremium: false });
  });

  it('free tier: the discovery sparkle sits beside Help me with this', async () => {
    await render(<WithDetailsAndNotes />);

    expect(screen.getByLabelText('Premium feature: AI task breakdown')).toBeTruthy();
    // Discovery only (AC3) — the gated button itself is untouched by gating.
    expect(screen.getByLabelText('Help me with this')).toBeTruthy();
  });

  it('premium: no sparkle rendered on the gated surface (AC4)', async () => {
    useEntitlementsStore.setState({ isPremium: true });
    await render(<WithDetailsAndNotes />);

    expect(screen.queryByLabelText('Premium feature: AI task breakdown')).toBeNull();
    expect(screen.getByLabelText('Help me with this')).toBeTruthy();
  });
});
