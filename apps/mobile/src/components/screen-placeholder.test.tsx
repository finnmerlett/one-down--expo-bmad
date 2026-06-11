import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as stories from './screen-placeholder.stories';

// Portable Stories: every story doubles as a headless crash-free render check.
const { Default } = composeStories(stories);

describe('ScreenPlaceholder (portable story)', () => {
  it('renders crash-free with the scaffold content', async () => {
    // RNTL v14: render is async
    await render(<Default />);

    expect(screen.getByText('Welcome to Expo')).toBeTruthy();
    expect(screen.getByText(/one-down scaffold/)).toBeTruthy();
  });
});
