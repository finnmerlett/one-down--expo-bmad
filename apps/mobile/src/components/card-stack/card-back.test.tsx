import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as cardBackStories from './card-back.stories';

const { FullDetails, Minimal, InProgress, FullyWired, WithReviewFlags, MissingDeadlineOnly } =
  composeStories(cardBackStories);

describe('CardBack (portable stories)', () => {
  it('renders all sections with the stored values', async () => {
    await render(<FullDetails />);

    expect(screen.getByLabelText('Task title').props.value).toBe('Book dentist appointment');
    expect(screen.getByLabelText('Task details').props.value).toBe(
      'Ask about the wisdom tooth while at it',
    );
    expect(screen.getByLabelText('Task notes').props.value).toBe(
      'Practice number is in the green folder',
    );
    // Same formatting call as the component — the assertion must not depend
    // on the test environment's default locale.
    const expectedDeadline = new Date('2026-06-20T09:00:00Z').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(screen.getByText(expectedDeadline)).toBeTruthy();
    expect(screen.getByLabelText('Back to card front')).toBeTruthy();
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByText('Cut loose')).toBeTruthy();
  });

  it('shows the empty deadline state', async () => {
    await render(<Minimal />);

    expect(screen.getByText('No deadline')).toBeTruthy();
  });

  it('saves a changed title on blur, but not an unchanged one', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    const title = screen.getByLabelText('Task title');
    await fireEvent(title, 'blur');
    expect(onPatch).not.toHaveBeenCalled();

    await fireEvent.changeText(title, '  Book hygienist appointment ');
    await fireEvent(title, 'blur');
    expect(onPatch).toHaveBeenCalledWith({ title: 'Book hygienist appointment' });
  });

  it('reverts a blanked title instead of saving it', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    const title = screen.getByLabelText('Task title');
    await fireEvent.changeText(title, '   ');
    await fireEvent(title, 'blur');

    expect(onPatch).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Task title').props.value).toBe('Book dentist appointment');
  });

  it('clears details to null when emptied', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    const details = screen.getByLabelText('Task details');
    await fireEvent.changeText(details, '');
    await fireEvent(details, 'blur');

    expect(onPatch).toHaveBeenCalledWith({ details: null });
  });

  it('toggles contexts in canonical order', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    // Stored contexts: home + phone. Adding Laptop slots it into union order.
    await fireEvent.press(screen.getByLabelText('Context: Laptop'));
    expect(onPatch).toHaveBeenCalledWith({ contexts: ['home', 'phone', 'laptop'] });

    // Toggling an active context removes it.
    await fireEvent.press(screen.getByLabelText('Context: Home'));
    expect(onPatch).toHaveBeenCalledWith({ contexts: ['phone'] });
  });

  it('follows an external notes update when the field is not being edited', async () => {
    const onPatch = jest.fn();
    const screen1 = await render(<FullDetails onPatch={onPatch} />);

    // Another screen (task running) wrote notes while this card sat hidden
    // beneath it — the new stored value must win over the mount-time state...
    const updatedTask = {
      ...FullDetails.args!.task!,
      notes: 'Rewritten on the running screen',
      updatedAt: new Date('2026-06-21T09:00:00Z'),
    };
    await screen1.rerender(<FullDetails onPatch={onPatch} task={updatedTask} />);
    expect(screen.getByLabelText('Task notes').props.value).toBe('Rewritten on the running screen');

    // ...and blurring the untouched field must NOT flush anything stale.
    await fireEvent(screen.getByLabelText('Task notes'), 'blur');
    expect(onPatch).not.toHaveBeenCalled();
  });

  it('labels the primary action Continue for an in-progress task', async () => {
    await render(<InProgress />);

    expect(screen.getByLabelText('Continue task')).toBeTruthy();
  });

  it('disables Cut loose when onCutLoose is not provided (Story 2.4)', async () => {
    // FullDetails omits onCutLoose (meta args only wire onStart).
    await render(<FullDetails />);
    expect(screen.getByLabelText('Cut loose').props.accessibilityState?.disabled).toBe(true);

    await render(<FullyWired />);
    expect(screen.getByLabelText('Cut loose').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('flushes pending text drafts before reporting Cut loose (Story 2.4, AC4)', async () => {
    const onPatch = jest.fn();
    const onCutLoose = jest.fn();
    await render(<FullDetails onPatch={onPatch} onCutLoose={onCutLoose} />);

    // Edited but NOT blurred — released tasks keep their latest notes for
    // the Epic 7 recycle bin restore.
    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Half-written thought');
    await fireEvent.press(screen.getByLabelText('Cut loose'));

    expect(onPatch).toHaveBeenCalledWith({ notes: 'Half-written thought' });
    expect(onCutLoose).toHaveBeenCalledTimes(1);
    // The invariant is the ORDER: persist first, then release.
    expect(onPatch.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onCutLoose.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('flushes pending text drafts before reporting Start', async () => {
    const onPatch = jest.fn();
    const onStart = jest.fn();
    await render(<FullDetails onPatch={onPatch} onStart={onStart} />);

    // Edited but NOT blurred — Start must persist the draft before leaving.
    await fireEvent.changeText(screen.getByLabelText('Task notes'), 'Bring the insurance card');
    await fireEvent.press(screen.getByLabelText('Start task'));

    expect(onPatch).toHaveBeenCalledWith({ notes: 'Bring the insurance card' });
    expect(onStart).toHaveBeenCalledTimes(1);
    // The invariant is the ORDER: persist first, then leave.
    expect(onPatch.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onStart.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('sets, and re-tap clears, the size', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    await fireEvent.press(screen.getByLabelText('Size: Big time'));
    expect(onPatch).toHaveBeenCalledWith({ size: 'big_time' });

    // FullDetails task is quick_win — tapping it again clears to unset.
    await fireEvent.press(screen.getByLabelText('Size: Quick win'));
    expect(onPatch).toHaveBeenCalledWith({ size: null });
  });
});

describe('CardBack review mode (Story 6.2)', () => {
  it('highlights flagged sections and forwards tick confirmations', async () => {
    const onConfirm = jest.fn();
    await render(<WithReviewFlags onConfirm={onConfirm} />);

    // Contexts + size show the inferred hint; the deadline section carries
    // the missing-deadline prompt instead (calm copy, warning tones).
    expect(screen.getAllByText('AI guessed')).toHaveLength(2);
    expect(screen.getByText('Needs a deadline — when?')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Confirm size'));
    expect(onConfirm).toHaveBeenCalledWith('size');
    await fireEvent.press(screen.getByLabelText('Confirm contexts'));
    expect(onConfirm).toHaveBeenCalledWith('contexts');
    await fireEvent.press(screen.getByLabelText('Confirm deadline'));
    expect(onConfirm).toHaveBeenCalledWith('deadline');
  });

  it('deadline chips patch an 18:00-local date; Clear stays hidden while flagged', async () => {
    const onPatch = jest.fn();
    await render(<MissingDeadlineOnly onPatch={onPatch} />);

    await fireEvent.press(screen.getByLabelText('Deadline: Tomorrow'));
    expect(onPatch).toHaveBeenCalledTimes(1);
    const patched = (onPatch.mock.calls[0]?.[0] as { deadline: Date }).deadline;
    expect(patched.getHours()).toBe(18);

    expect(screen.queryByLabelText('Clear deadline')).toBeNull();
  });

  it('Clear shows for a set, unflagged deadline and patches null', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    await fireEvent.press(screen.getByLabelText('Clear deadline'));
    expect(onPatch).toHaveBeenCalledWith({ deadline: null });
  });

  it('renders no review chrome for an unflagged task', async () => {
    await render(<FullDetails />);

    expect(screen.queryByText('AI guessed')).toBeNull();
    expect(screen.queryByLabelText('Confirm size')).toBeNull();
  });
});

// Expand/contract animation, flush-on-close, and the tap-to-flip gesture are
// UI-thread behaviors — covered on-device by Maestro flow 05.
