import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { PROMPT_COPY } from './task-health-prompt';
import * as stories from './micro-task-nudge.stories';

const { Idle, Loading, ErrorState } = composeStories(stories);

describe('MicroTaskNudge (portable stories — v1.5 E9 → 9.8 D3 health prompt)', () => {
  it('renders the original avoided-prompt copy with all three actions', async () => {
    const onGo = jest.fn();
    const onKeep = jest.fn();
    const onCutLoose = jest.fn();
    const user = userEvent.setup();
    await render(<Idle onGo={onGo} onKeep={onKeep} onCutLoose={onCutLoose} />);

    expect(screen.getByText(PROMPT_COPY.avoided)).toBeTruthy();
    await user.press(screen.getByLabelText('Break it down'));
    expect(onGo).toHaveBeenCalledTimes(1);
    await user.press(screen.getByLabelText('Keep it'));
    expect(onKeep).toHaveBeenCalledTimes(1);
    await user.press(screen.getByLabelText('Cut loose from prompt'));
    expect(onCutLoose).toHaveBeenCalledTimes(1);
  });

  it('busy state disables every action (no double-fetch, no mid-fetch release)', async () => {
    const onGo = jest.fn();
    const onCutLoose = jest.fn();
    const user = userEvent.setup();
    await render(<Loading onGo={onGo} onCutLoose={onCutLoose} />);

    await user.press(screen.getByLabelText('Break it down'));
    await user.press(screen.getByLabelText('Cut loose from prompt'));
    expect(onGo).not.toHaveBeenCalled();
    expect(onCutLoose).not.toHaveBeenCalled();
  });

  it('error state offers a retry', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorState onRetry={onRetry} />);

    await user.press(screen.getByLabelText('Retry tiny step'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
