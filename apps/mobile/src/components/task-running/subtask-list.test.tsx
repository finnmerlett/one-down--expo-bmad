import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './subtask-list.stories';

const { Empty, MixedCompletion, RefineOpen } = composeStories(stories);

describe('SubtaskList (portable stories)', () => {
  it('renders nothing when there are no subtasks', async () => {
    await render(<Empty />);
    expect(screen.queryByText('Steps')).toBeNull();
  });

  it('exposes checkbox semantics and forwards toggle/delete per row', async () => {
    const onToggle = jest.fn();
    const onDelete = jest.fn();
    const user = userEvent.setup();
    await render(<MixedCompletion onToggle={onToggle} onDelete={onDelete} />);

    const completed = screen.getByLabelText('Subtask: Get everything you need in one place');
    expect(completed.props.accessibilityState?.checked).toBe(true);
    const pending = screen.getByLabelText('Subtask: Do just the first two minutes');
    expect(pending.props.accessibilityState?.checked).toBe(false);

    await user.press(pending);
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'subtask-2', completed: false }),
    );

    await user.press(screen.getByLabelText('Delete subtask: Set a 10-minute timer and keep going'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'subtask-3' }));
  });

  it('shows no Refine button when onRefine is not wired (6.3 surfaces stay valid)', async () => {
    await render(<MixedCompletion />);
    expect(screen.queryByLabelText('Refine')).toBeNull();
  });

  it('refine input blocks empty feedback and forwards trimmed text (Story 6.4)', async () => {
    const onRefine = jest.fn();
    const user = userEvent.setup();
    await render(<RefineOpen onRefine={onRefine} />);

    const send = screen.getByLabelText('Send feedback');
    // Empty feedback can't submit (AC1).
    expect(send.props.accessibilityState?.disabled).toBe(true);

    await user.type(
      screen.getByLabelText('Breakdown feedback'),
      'Too vague, give me physical actions',
    );
    await user.press(screen.getByLabelText('Send feedback'));
    expect(onRefine).toHaveBeenCalledWith('Too vague, give me physical actions');
    // Submitting collapses the input back to the Refine button.
    expect(screen.queryByLabelText('Breakdown feedback')).toBeNull();
    expect(screen.getByLabelText('Refine')).toBeTruthy();
  });
});
