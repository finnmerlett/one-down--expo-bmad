import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './debug-section.stories';

const { SignedIn, SignedOut } = composeStories(stories);

describe('DebugSection (portable stories — 9.8 F3)', () => {
  it('capture shows the returned uuid selectable with a share action', async () => {
    const onCapture = jest.fn().mockResolvedValue('feed0000-1111-4222-8333-444455556666');
    const user = userEvent.setup();
    await render(<SignedIn onCapture={onCapture} />);

    await user.press(screen.getByLabelText('Get state snapshot'));

    expect(onCapture).toHaveBeenCalledTimes(1);
    const id = screen.getByLabelText('Snapshot id');
    expect(id.props.children).toBe('feed0000-1111-4222-8333-444455556666');
    expect(id.props.selectable).toBe(true);
    expect(screen.getByLabelText('Share snapshot id')).toBeTruthy();
  });

  it('shows the failure line when the upload rejects', async () => {
    const onCapture = jest.fn().mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    await render(<SignedIn onCapture={onCapture} />);

    await user.press(screen.getByLabelText('Get state snapshot'));

    expect(screen.getByText(/Could not save the snapshot/)).toBeTruthy();
    expect(screen.queryByLabelText('Snapshot id')).toBeNull();
  });

  it('signed out: the button is disabled with an explainer', async () => {
    const onCapture = jest.fn();
    const user = userEvent.setup();
    await render(<SignedOut onCapture={onCapture} />);

    await user.press(screen.getByLabelText('Get state snapshot'));
    expect(onCapture).not.toHaveBeenCalled();
    expect(screen.getByText(/Sign in to save snapshots/)).toBeTruthy();
  });
});
