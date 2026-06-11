import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as cardBackStories from './card-back.stories';

const { FullDetails, Minimal } = composeStories(cardBackStories);

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

// Expand/contract animation, flush-on-close, and the tap-to-flip gesture are
// UI-thread behaviors — covered on-device by Maestro flow 05.
