import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { FloatingAddButton } from './floating-add-button';
import * as appShellStories from './app-shell.stories';
import * as fabStories from './floating-add-button.stories';
import * as starBoxStories from './star-box-placeholder.stories';
import * as topBarStories from './top-bar.stories';

const { HomeScreen } = composeStories(appShellStories);
const { Default: FabDefault } = composeStories(fabStories);
const { Default: StarBoxDefault } = composeStories(starBoxStories);
const { Default: TopBarDefault } = composeStories(topBarStories);

describe('app-shell (portable stories)', () => {
  it('full shell renders all four navigation controls plus content', async () => {
    await render(<HomeScreen />);

    expect(screen.getByLabelText('Open task list')).toBeTruthy();
    expect(screen.getByLabelText('View star activity')).toBeTruthy();
    expect(screen.getByLabelText('Open settings')).toBeTruthy();
    expect(screen.getByLabelText('Add task')).toBeTruthy();
    expect(screen.getByText('Your tasks will appear here')).toBeTruthy();
  });

  it('sub-component stories render crash-free', async () => {
    await render(<TopBarDefault />);
    await render(<StarBoxDefault />);
    await render(<FabDefault />);
  });

  it('FAB press reaches the handler (quick-add wiring point for 1.2)', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<FloatingAddButton onPress={onPress} />);

    await user.press(screen.getByLabelText('Add task'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
