import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import * as triageStories from './triage-list.stories';

const { AllReasons, AllCaughtUp } = composeStories(triageStories);

describe('TriageList (portable stories)', () => {
  it('renders one row per task with its reason chip', async () => {
    await render(<AllReasons />);

    expect(screen.getByText('Send the tax form')).toBeTruthy();
    expect(screen.getByText('Deadline passed')).toBeTruthy();
    expect(screen.getByText('Reply to that email')).toBeTruthy();
    expect(screen.getByText('Skipped a lot')).toBeTruthy();
    expect(screen.getByText('Sort the filing cabinet')).toBeTruthy();
    expect(screen.getByText('Been a while')).toBeTruthy();
  });

  it('reports the row for each of the three decisions', async () => {
    const onKeep = jest.fn();
    const onCutLoose = jest.fn();
    const onLater = jest.fn();
    await render(<AllReasons onKeep={onKeep} onCutLoose={onCutLoose} onLater={onLater} />);

    // Row-scoped labels repeat per row — index by row order.
    await fireEvent.press(screen.getAllByLabelText('Keep task')[0]!);
    expect(onKeep.mock.calls[0]?.[0]?.task.id).toBe('task-due');

    await fireEvent.press(screen.getAllByLabelText('Cut task loose')[1]!);
    expect(onCutLoose.mock.calls[0]?.[0]?.task.id).toBe('task-avoided');
    expect(onCutLoose.mock.calls[0]?.[0]?.reason).toBe('avoided');

    await fireEvent.press(screen.getAllByLabelText('Decide later')[2]!);
    expect(onLater.mock.calls[0]?.[0]?.task.id).toBe('task-stale');
  });

  it('shows the "All caught up" state with a deck CTA when nothing needs attention', async () => {
    const onGoToDeck = jest.fn();
    await render(<AllCaughtUp onGoToDeck={onGoToDeck} />);

    expect(screen.getByText('All caught up')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Go to your deck'));
    expect(onGoToDeck).toHaveBeenCalledTimes(1);
  });
});
