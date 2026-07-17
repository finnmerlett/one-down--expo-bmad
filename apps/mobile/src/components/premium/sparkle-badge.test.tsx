import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from 'expo-router';

import { setAnalyticsClient } from '@/lib/analytics/track';

import * as sparkleBadgeStories from './sparkle-badge.stories';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const { FreeTier, PremiumHidesBadge } = composeStories(sparkleBadgeStories);

describe('SparkleBadge (portable stories)', () => {
  afterEach(() => {
    setAnalyticsClient(null);
    jest.clearAllMocks();
  });

  it('free tier: tappable sparkle labelled with the feature title; tap tracks then opens /premium', async () => {
    const capture = jest.fn();
    setAnalyticsClient({ capture });
    await render(<FreeTier />);

    const badge = screen.getByLabelText('Premium feature: AI task breakdown');
    await fireEvent.press(badge);

    expect(capture).toHaveBeenCalledWith('premium_sparkle_tapped', { feature: 'ai_breakdown' });
    expect(router.push).toHaveBeenCalledWith('/premium');
  });

  it('premium: renders nothing (AC4)', async () => {
    await render(<PremiumHidesBadge />);

    expect(screen.queryByLabelText('Premium feature: AI task breakdown')).toBeNull();
  });
});
