import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as stories from './steps-editor.stories';

const { EditingSteps } = composeStories(stories);

const edits = () => ({
  rename: jest.fn(),
  remove: jest.fn(),
  add: jest.fn(),
  reorder: jest.fn(),
});

describe('StepsEditor (D4, 05a/05b)', () => {
  it('shows the editing label line, grips, bins, and the add row', async () => {
    await render(<EditingSteps />);

    expect(screen.getByText('Editing 3 steps')).toBeTruthy();
    expect(screen.getByLabelText('Done editing')).toBeTruthy();
    expect(screen.getByLabelText('Add a step')).toBeTruthy();
    expect(screen.getByLabelText('Reorder step: Do just the first two minutes')).toBeTruthy();
    expect(screen.getByLabelText('Delete subtask: Do just the first two minutes')).toBeTruthy();
    expect(screen.getByText('Drag to reorder · tap the words to rewrite')).toBeTruthy();
  });

  it('tap the words → caret in place; return commits the rewrite', async () => {
    const callbacks = edits();
    await render(<EditingSteps edits={callbacks} />);

    await fireEvent.press(screen.getByLabelText('Rewrite step: Do just the first two minutes'));
    const input = screen.getByLabelText('Rewrite step: Do just the first two minutes');
    expect(input.props.value).toBe('Do just the first two minutes');

    await fireEvent.changeText(input, 'Do the first five minutes');
    await fireEvent(input, 'submitEditing');

    expect(callbacks.rename).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'subtask-2' }),
      'Do the first five minutes',
    );
  });

  it('an unchanged or blank rewrite is a no-op', async () => {
    const callbacks = edits();
    await render(<EditingSteps edits={callbacks} />);

    await fireEvent.press(screen.getByLabelText('Rewrite step: Do just the first two minutes'));
    const input = screen.getByLabelText('Rewrite step: Do just the first two minutes');
    await fireEvent.changeText(input, '   ');
    await fireEvent(input, 'submitEditing');

    expect(callbacks.rename).not.toHaveBeenCalled();
  });

  it('Add a step opens an input and commits the trimmed title', async () => {
    const callbacks = edits();
    await render(<EditingSteps edits={callbacks} />);

    await fireEvent.press(screen.getByLabelText('Add a step'));
    const input = screen.getByLabelText('New step title');
    await fireEvent.changeText(input, '  Label the boxes ');
    await fireEvent(input, 'submitEditing');

    expect(callbacks.add).toHaveBeenCalledWith('Label the boxes');
  });

  it('the bin forwards the delete; Done fires onDone', async () => {
    const callbacks = edits();
    const onDone = jest.fn();
    await render(<EditingSteps edits={callbacks} onDone={onDone} />);

    await fireEvent.press(
      screen.getByLabelText('Delete subtask: Set a 10-minute timer and keep going'),
    );
    expect(callbacks.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'subtask-3' }));

    await fireEvent.press(screen.getByLabelText('Done editing'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
