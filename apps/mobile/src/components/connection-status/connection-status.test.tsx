import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as stories from './connection-status.stories';

const { Checking, Connected, Offline } = composeStories(stories);

describe('ConnectionStatusView (portable stories)', () => {
  it.each([
    ['checking', Checking],
    ['connected', Connected],
    ['offline', Offline],
  ] as const)('renders the %s state with its accessible label', async (state, Story) => {
    await render(<Story />);
    expect(screen.getByLabelText(`Server connection: ${state}`)).toBeTruthy();
  });

  it('shows the working-offline line only when offline', async () => {
    await render(<Offline />);
    expect(screen.getByText("Couldn't reach the server — working offline")).toBeTruthy();

    screen.unmount();
    await render(<Connected />);
    expect(screen.queryByText("Couldn't reach the server — working offline")).toBeNull();
  });
});
