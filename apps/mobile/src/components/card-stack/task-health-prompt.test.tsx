import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as promptStories from './task-health-prompt.stories';

const { Stale, Avoided } = composeStories(promptStories);

describe('TaskHealthPrompt (portable stories)', () => {
  it('shows the stale copy and reports all three decisions', async () => {
    const onKeep = jest.fn();
    const onCutLoose = jest.fn();
    const onBreakDown = jest.fn();
    await render(<Stale onKeep={onKeep} onCutLoose={onCutLoose} onBreakDown={onBreakDown} />);

    expect(screen.getByText("This one's been waiting a while. Still worth doing?")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Keep it'));
    await fireEvent.press(screen.getByLabelText('Cut loose from prompt'));
    await fireEvent.press(screen.getByLabelText('Break it down'));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onCutLoose).toHaveBeenCalledTimes(1);
    expect(onBreakDown).toHaveBeenCalledTimes(1);
  });

  it('shows the no-judgement avoided copy', async () => {
    await render(<Avoided />);

    expect(
      screen.getByText('You keep skipping this one. No judgement — what would help?'),
    ).toBeTruthy();
  });
});
