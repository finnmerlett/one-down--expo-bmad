import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as cardBackStories from './card-back.stories';

const { FullDetails, Minimal, WithReviewFlags, MissingDeadlineOnly, WithHealthPrompt } =
  composeStories(cardBackStories);

describe('CardBack (portable stories, v1.5 frame 06)', () => {
  it('renders the editing header, fields, and the gold value pill', async () => {
    await render(<FullDetails />);

    expect(screen.getByText('Editing card')).toBeTruthy();
    expect(screen.getByLabelText('Task title').props.value).toBe('Book dentist appointment');
    expect(screen.getByLabelText('Task details').props.value).toBe(
      'Ask about the wisdom tooth while at it',
    );
    // Same formatting call as the component — the assertion must not depend
    // on the test environment's default locale.
    const expectedDeadline = new Date('2026-06-20T09:00:00Z').toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    expect(screen.getByText(expectedDeadline)).toBeTruthy();
    expect(screen.getByLabelText('Back to card front')).toBeTruthy();
    // Quick win → 5★ header pill; no Start/Cut loose on the back (v1.5).
    expect(screen.getByLabelText('Worth 5 stars')).toBeTruthy();
    expect(screen.getByLabelText('Done editing')).toBeTruthy();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Cut loose')).toBeNull();
  });

  it('shows the empty deadline state', async () => {
    await render(<Minimal />);

    expect(screen.getByText('No deadline')).toBeTruthy();
  });

  it('renders the health prompt for a flagged task and wires the three decisions (Story 7.2)', async () => {
    const onKeep = jest.fn();
    const onStart = jest.fn();
    const onCutLoose = jest.fn();
    await render(<WithHealthPrompt onKeep={onKeep} onStart={onStart} onCutLoose={onCutLoose} />);

    expect(
      screen.getByText('You keep skipping this one. No judgement — what would help?'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Keep it'));
    expect(onKeep).toHaveBeenCalledTimes(1);
    // Break it down rides the Start path (flush → start → running screen).
    await fireEvent.press(screen.getByLabelText('Break it down'));
    expect(onStart).toHaveBeenCalledTimes(1);
    // Cut loose from the prompt is the only release path on the back now.
    await fireEvent.press(screen.getByLabelText('Cut loose from prompt'));
    expect(onCutLoose).toHaveBeenCalledTimes(1);
  });

  it('shows no health prompt on a healthy task (Story 7.2)', async () => {
    await render(<Minimal />);

    expect(screen.queryByLabelText('Keep it')).toBeNull();
    expect(screen.queryByLabelText('Cut loose from prompt')).toBeNull();
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

  it('flushes pending text drafts on Done editing, in order', async () => {
    const onPatch = jest.fn();
    const onClose = jest.fn();
    await render(<FullDetails onPatch={onPatch} onClose={onClose} />);

    // Edited but NOT blurred — Done must persist the draft before closing.
    await fireEvent.changeText(screen.getByLabelText('Task details'), 'Bring the insurance card');
    await fireEvent.press(screen.getByLabelText('Done editing'));

    expect(onPatch).toHaveBeenCalledWith({ details: 'Bring the insurance card' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      onClose.mock.invocationCallOrder[0] ?? 0,
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

describe('CardBack F-treatment (v1.5 Row F)', () => {
  it('tags guessed groups WE GUESSED and forwards the group ticks', async () => {
    const onConfirm = jest.fn();
    await render(<WithReviewFlags onConfirm={onConfirm} />);

    // Deadline + requires + size all guessed.
    expect(screen.getAllByText('We guessed')).toHaveLength(3);

    await fireEvent.press(screen.getByLabelText('Confirm size'));
    expect(onConfirm).toHaveBeenCalledWith('size');
    await fireEvent.press(screen.getByLabelText('Confirm contexts'));
    expect(onConfirm).toHaveBeenCalledWith('contexts');
    await fireEvent.press(screen.getByLabelText('Confirm deadline'));
    expect(onConfirm).toHaveBeenCalledWith('deadline');
  });

  it('Confirm all guesses ticks every pending group at once', async () => {
    const onConfirm = jest.fn();
    await render(<WithReviewFlags onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByLabelText('Confirm all guesses'));
    expect(onConfirm).toHaveBeenCalledTimes(3);
    expect(onConfirm.mock.calls.map((call) => call[0]).sort()).toEqual([
      'contexts',
      'deadline',
      'size',
    ]);
  });

  it('missing deadline renders NOTHING TO GO ON; None answers it', async () => {
    const onConfirm = jest.fn();
    await render(<MissingDeadlineOnly onConfirm={onConfirm} />);

    expect(screen.getByText('Nothing to go on')).toBeTruthy();
    expect(screen.getByText('Missing this detail')).toBeTruthy();
    // No confirm-all — a missing detail needs an answer, not agreement.
    expect(screen.queryByLabelText('Confirm all guesses')).toBeNull();

    await fireEvent.press(screen.getByLabelText('No deadline needed'));
    expect(onConfirm).toHaveBeenCalledWith('missingDeadline');
  });

  it('Clear shows for a set, unflagged deadline and patches null', async () => {
    const onPatch = jest.fn();
    await render(<FullDetails onPatch={onPatch} />);

    await fireEvent.press(screen.getByLabelText('Clear deadline'));
    expect(onPatch).toHaveBeenCalledWith({ deadline: null });
  });

  it('renders no blueprint chrome for an unflagged task', async () => {
    await render(<FullDetails />);

    expect(screen.queryByText('We guessed')).toBeNull();
    expect(screen.queryByLabelText('Confirm size')).toBeNull();
    expect(screen.queryByLabelText('Confirm all guesses')).toBeNull();
  });
});

// Expand/contract animation, flush-on-close, and the tap-to-flip gesture are
// UI-thread behaviors — covered on-device by Maestro flow 05.
