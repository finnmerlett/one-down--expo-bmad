import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import * as stories from './micro-task-nudge.stories';

const { Idle, Loading, ErrorState } = composeStories(stories);

describe('MicroTaskNudge (portable stories — v1.5 E9)', () => {
  it('one-tap go reaches the handler', async () => {
    const onGo = jest.fn();
    const user = userEvent.setup();
    await render(<Idle onGo={onGo} />);

    expect(screen.getByText('This one keeps coming back round.')).toBeTruthy();
    await user.press(screen.getByLabelText('Show me the smallest step'));
    expect(onGo).toHaveBeenCalledTimes(1);
  });

  it('busy state disables the chip (no double-fetch)', async () => {
    const onGo = jest.fn();
    const user = userEvent.setup();
    await render(<Loading onGo={onGo} />);

    await user.press(screen.getByLabelText('Show me the smallest step'));
    expect(onGo).not.toHaveBeenCalled();
  });

  it('error state offers a retry', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState onRetry={onRetry} />);

    await user.press(screen.getByLabelText('Retry tiny step'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
