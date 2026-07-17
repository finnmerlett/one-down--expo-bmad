import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as stories from './sync-indicator.stories';

const { Pending, Retrying } = composeStories(stories);

describe('SyncIndicatorView (portable stories)', () => {
  it.each([
    ['Sync pending', Pending],
    ['Sync retrying', Retrying],
  ] as const)('renders with the "%s" accessible label', async (label, Story) => {
    await render(<Story />);
    expect(screen.getByLabelText(label)).toBeTruthy();
  });
});
