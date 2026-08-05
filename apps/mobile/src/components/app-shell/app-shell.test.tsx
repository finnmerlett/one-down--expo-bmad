import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { BottomActions } from './bottom-actions';
import * as appShellStories from './app-shell.stories';
import * as bottomActionsStories from './bottom-actions.stories';
import * as starCounterStories from './star-counter.stories';
import * as topBarStories from './top-bar.stories';

const { HomeScreen } = composeStories(appShellStories);
const { Default: BottomActionsDefault, WithTriageEntry } = composeStories(bottomActionsStories);
const {
  Zero: StarCounterZero,
  WithStars: StarCounterWithStars,
  WithBanked: StarCounterWithBanked,
} = composeStories(starCounterStories);
const { Default: TopBarDefault, WithStars: TopBarWithStars } = composeStories(topBarStories);

describe('app-shell (portable stories)', () => {
  it('full shell renders navigation controls, standing actions and content', async () => {
    await render(<HomeScreen />);

    expect(screen.getByLabelText('Open task list')).toBeTruthy();
    // Star counter defaults to real zeros without totals wired (4.2 AC4).
    expect(screen.getByLabelText('0 stars, 0 earned today')).toBeTruthy();
    expect(screen.getByLabelText('Open settings')).toBeTruthy();
    expect(screen.getByLabelText('Add a task')).toBeTruthy();
    expect(screen.getByLabelText('Brain dump')).toBeTruthy();
    expect(screen.getByText('Your tasks will appear here')).toBeTruthy();
  });

  it('sub-component stories render crash-free', async () => {
    await render(<TopBarDefault />);
    await render(<StarCounterZero />);
    await render(<BottomActionsDefault />);
  });

  it('star counter exposes totals through its a11y label and forwards presses (4.2)', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<StarCounterWithStars onPress={onPress} />);

    // The Pressable label collapses inner text — the FULL label is the
    // Maestro/screen-reader selector (AC3).
    const counter = screen.getByLabelText('42 stars, 5 earned today');
    await user.press(counter);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('banked segment joins the counter label only when non-zero (v1.5)', async () => {
    await render(<StarCounterWithBanked />);

    expect(screen.getByLabelText('65 stars, 1 earned today, 1 banked')).toBeTruthy();
  });

  it('top bar passes totals through to the counter (4.2)', async () => {
    await render(<TopBarWithStars />);

    expect(screen.getByLabelText('42 stars, 5 earned today')).toBeTruthy();
  });

  it('standing actions reach their handlers (quick add + brain dump)', async () => {
    const onAddPress = jest.fn();
    const onBrainDumpPress = jest.fn();
    const user = userEvent.setup();
    await render(<BottomActions onAddPress={onAddPress} onBrainDumpPress={onBrainDumpPress} />);

    await user.press(screen.getByLabelText('Add a task'));
    await user.press(screen.getByLabelText('Brain dump'));

    expect(onAddPress).toHaveBeenCalledTimes(1);
    expect(onBrainDumpPress).toHaveBeenCalledTimes(1);
  });

  it('triage entry renders only on the expanded sheet with a non-zero queue', async () => {
    await render(<WithTriageEntry />);

    expect(screen.getByLabelText('Check 8 guessed tasks')).toBeTruthy();
  });
});
