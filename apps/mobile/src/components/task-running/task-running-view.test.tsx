import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as taskRunningStories from './task-running-view.stories';

const { WithDetailsAndNotes, Bare } = composeStories(taskRunningStories);

describe('TaskRunningView (portable stories)', () => {
  it('shows title, details, stored notes, and the action row', async () => {
    await render(<WithDetailsAndNotes />);

    expect(screen.getByText('Sort out the garage')).toBeTruthy();
    expect(screen.getByText('At least clear a path to the freezer')).toBeTruthy();
    expect(screen.getByLabelText('Task notes').props.value).toBe('Shelves are up, boxes next');
    // Present but inert until their stories land (2.3 / Epic 6 / 2.4).
    expect(screen.getByLabelText('Done').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByLabelText('Help me with this').props.accessibilityState?.disabled).toBe(
      true,
    );
    expect(screen.getByLabelText('Cut loose').props.accessibilityState?.disabled).toBe(true);
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
