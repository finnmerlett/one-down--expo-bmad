import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './empty-state.stories';

const { WithAction, MessageOnly } = composeStories(stories);

describe('EmptyState (portable stories)', () => {
  it('shows title, body, and forwards the CTA press', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    await render(<WithAction onAction={onAction} />);

    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText('Get things out of your head — add your first task.')).toBeTruthy();

    await user.press(screen.getByLabelText('Add a task'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders without a button when no action is given', async () => {
    await render(<MessageOnly />);

    expect(screen.getByText('All clear')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
