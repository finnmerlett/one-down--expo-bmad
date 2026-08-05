import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { reportLabel } from './subtask-list';
import * as stories from './subtask-list.stories';

const { Empty, MixedCompletion, AfterAiChange } = composeStories(stories);

describe('SubtaskList (portable stories)', () => {
  it('renders nothing when there are no subtasks', async () => {
    await render(<Empty />);
    expect(screen.queryByText('Steps')).toBeNull();
  });

  it('exposes checkbox semantics and forwards toggles per row', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<MixedCompletion onToggle={onToggle} />);

    const completed = screen.getByLabelText('Subtask: Get everything you need in one place');
    expect(completed.props.accessibilityState?.checked).toBe(true);
    const pending = screen.getByLabelText('Subtask: Do just the first two minutes');
    expect(pending.props.accessibilityState?.checked).toBe(false);

    await user.press(pending);
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'subtask-2', completed: false }),
    );
  });

  it('shows the report line, NEW tags on fresh rows only, and forwards Undo (D4, 05e)', async () => {
    const onUndo = jest.fn();
    const user = userEvent.setup();
    await render(<AfterAiChange onUndo={onUndo} />);

    expect(screen.getByText('1 ADDED · 1 CHANGED')).toBeTruthy();
    // Two uncompleted rows are in newTitles; the completed row never tags.
    expect(screen.getAllByText('New')).toHaveLength(2);

    await user.press(screen.getByLabelText('Undo step changes'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('offers the Edit chip when edit mode is wired', async () => {
    await render(<AfterAiChange />);
    expect(screen.getByLabelText('Edit steps')).toBeTruthy();
  });

  it('hides the Edit chip when edit mode is not wired', async () => {
    await render(<MixedCompletion />);
    expect(screen.queryByLabelText('Edit steps')).toBeNull();
  });
});

describe('reportLabel', () => {
  it('joins added and changed segments, dropping zero counts', () => {
    expect(reportLabel({ added: 2, changed: 1 })).toBe('2 ADDED · 1 CHANGED');
    expect(reportLabel({ added: 3, changed: 0 })).toBe('3 ADDED');
    expect(reportLabel({ added: 0, changed: 2 })).toBe('2 CHANGED');
    expect(reportLabel({ added: 0, changed: 0 })).toBe('NO CHANGES');
  });
});
