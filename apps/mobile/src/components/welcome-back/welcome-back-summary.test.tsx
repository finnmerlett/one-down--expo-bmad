import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { buildSummaryLines } from './welcome-back-summary';
import * as summaryStories from './welcome-back-summary.stories';

const { Typical, NoDeadlines, Singular, NothingWaiting } = composeStories(summaryStories);

describe('buildSummaryLines (Story 7.3, pure copy builder)', () => {
  it('omits every zero-count line and falls back to the all-caught-up line', () => {
    expect(
      buildSummaryLines({ daysAway: 0, tasksWaiting: 0, deadlinesPassed: 0, staleSuggestions: 0 }),
    ).toEqual(["Nothing's waiting — you're all caught up."]);
  });

  it('uses singular grammar at count 1', () => {
    expect(
      buildSummaryLines({ daysAway: 1, tasksWaiting: 1, deadlinesPassed: 1, staleSuggestions: 1 }),
    ).toEqual([
      "It's been 1 day.",
      '1 task is waiting for you.',
      '1 deadline passed while you were away.',
      '1 task might be worth cutting loose.',
    ]);
  });
});

describe('WelcomeBackSummary (portable stories)', () => {
  it('renders the guilt-free factual summary with both CTAs', async () => {
    const onTriage = jest.fn();
    const onDeck = jest.fn();
    await render(<Typical onTriage={onTriage} onDeck={onDeck} />);

    expect(screen.getByText('Welcome back!')).toBeTruthy();
    expect(screen.getByText("It's been 5 days.")).toBeTruthy();
    expect(screen.getByText('3 tasks are waiting for you.')).toBeTruthy();
    expect(screen.getByText('1 deadline passed while you were away.')).toBeTruthy();
    expect(screen.getByText('2 tasks might be worth cutting loose.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Let's see what's up"));
    expect(onTriage).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('Go to main deck'));
    expect(onDeck).toHaveBeenCalledTimes(1);
  });

  it('omits zero-count lines entirely', async () => {
    await render(<NoDeadlines />);

    expect(screen.getByText('2 tasks are waiting for you.')).toBeTruthy();
    expect(screen.queryByText(/deadline/)).toBeNull();
    expect(screen.queryByText(/cutting loose/)).toBeNull();
  });

  it('renders singular copy', async () => {
    await render(<Singular />);

    expect(screen.getByText("It's been 1 day.")).toBeTruthy();
    expect(screen.getByText('1 task is waiting for you.')).toBeTruthy();
  });

  it('handles the degenerate zero summary without an empty body', async () => {
    await render(<NothingWaiting />);

    expect(screen.getByText("Nothing's waiting — you're all caught up.")).toBeTruthy();
  });
});
