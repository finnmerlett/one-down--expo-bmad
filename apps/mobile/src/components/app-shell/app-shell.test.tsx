import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { FloatingAddButton } from './floating-add-button';
import * as appShellStories from './app-shell.stories';
import * as fabStories from './floating-add-button.stories';
import * as starCounterStories from './star-counter.stories';
import * as topBarStories from './top-bar.stories';

const { HomeScreen } = composeStories(appShellStories);
const { Default: FabDefault } = composeStories(fabStories);
const { Zero: StarCounterZero, WithStars: StarCounterWithStars } =
  composeStories(starCounterStories);
const { Default: TopBarDefault, WithStars: TopBarWithStars } = composeStories(topBarStories);

describe('app-shell (portable stories)', () => {
  it('full shell renders all four navigation controls plus content', async () => {
    await render(<HomeScreen />);

    expect(screen.getByLabelText('Open task list')).toBeTruthy();
    // Star counter defaults to real zeros without totals wired (4.2 AC4).
    expect(screen.getByLabelText('0 stars, 0 earned today')).toBeTruthy();
    expect(screen.getByLabelText('Open settings')).toBeTruthy();
    expect(screen.getByLabelText('Add task')).toBeTruthy();
    expect(screen.getByText('Your tasks will appear here')).toBeTruthy();
  });

  it('sub-component stories render crash-free', async () => {
    await render(<TopBarDefault />);
    await render(<StarCounterZero />);
    await render(<FabDefault />);
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

  it('top bar passes totals through to the counter (4.2)', async () => {
    await render(<TopBarWithStars />);

    expect(screen.getByLabelText('42 stars, 5 earned today')).toBeTruthy();
  });

  it('FAB press reaches the handler (quick-add wiring point for 1.2)', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<FloatingAddButton onPress={onPress} />);

    await user.press(screen.getByLabelText('Add task'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
