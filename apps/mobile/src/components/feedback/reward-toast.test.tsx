import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as rewardToastStories from './reward-toast.stories';

const { Completion, Released, SingleStar } = composeStories(rewardToastStories);

describe('RewardToast (portable stories)', () => {
  it('shows the award title and pluralized star amount', async () => {
    await render(<Completion />);

    expect(screen.getByText('One down!')).toBeTruthy();
    expect(screen.getByText('+5 stars')).toBeTruthy();
  });

  it('shows the cut-loose acknowledgment copy (Story 2.4)', async () => {
    await render(<Released />);

    expect(screen.getByText('Released')).toBeTruthy();
    expect(screen.getByText('+2 stars')).toBeTruthy();
  });

  it('uses singular copy for a single star', async () => {
    await render(<SingleStar />);

    expect(screen.getByText('+1 star')).toBeTruthy();
    expect(screen.queryByText('+1 stars')).toBeNull();
  });
});
