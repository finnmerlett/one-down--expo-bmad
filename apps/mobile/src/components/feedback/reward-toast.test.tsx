import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as rewardToastStories from './reward-toast.stories';

const { Completion, SingleStar } = composeStories(rewardToastStories);

describe('RewardToast (portable stories)', () => {
  it('shows the award title and pluralized star amount', async () => {
    await render(<Completion />);

    expect(screen.getByText('One down!')).toBeTruthy();
    expect(screen.getByText('+5 stars')).toBeTruthy();
  });

  it('uses singular copy for a single star', async () => {
    await render(<SingleStar />);

    expect(screen.getByText('+1 star')).toBeTruthy();
    expect(screen.queryByText('+1 stars')).toBeNull();
  });
});
