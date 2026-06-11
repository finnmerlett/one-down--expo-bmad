import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './quick-add-sheet.stories';

const { Open } = composeStories(stories);

describe('QuickAddSheet (portable story)', () => {
  it('blocks empty-title submission with inline feedback', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Open onSubmit={onSubmit} />);

    await user.press(screen.getByLabelText('Save task'));

    expect(screen.getByText('Give your task a title first')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits title + details and clears the inputs', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<Open onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Task title'), 'Buy milk');
    await user.type(screen.getByLabelText('Task details'), 'semi-skimmed');
    await user.press(screen.getByLabelText('Save task'));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy milk', details: 'semi-skimmed' });
    expect(screen.getByLabelText('Task title').props.value).toBe('');
    expect(screen.getByLabelText('Task details').props.value).toBe('');
    expect(screen.queryByText(/title first/)).toBeNull();
  });

  it('typing clears a previous validation error', async () => {
    const user = userEvent.setup();
    await render(<Open />);

    await user.press(screen.getByLabelText('Save task'));
    expect(screen.getByText('Give your task a title first')).toBeTruthy();

    await user.type(screen.getByLabelText('Task title'), 'B');
    expect(screen.queryByText('Give your task a title first')).toBeNull();
  });
});
