import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react-native';

import * as premiumFeaturesViewStories from './premium-features-view.stories';

const { WithSubscribe, Purchasing, PurchaseError, PremiumConfirmation } = composeStories(
  premiumFeaturesViewStories,
);

describe('PremiumFeaturesView purchase states (portable stories)', () => {
  it('idle: live Subscribe CTA, no error copy', async () => {
    await render(<WithSubscribe />);

    expect(screen.getByLabelText('Subscribe')).toBeTruthy();
    expect(
      screen.queryByText('Something went wrong with the purchase — nothing was charged.'),
    ).toBeNull();
  });

  it('purchasing: CTA disabled with in-place progress copy', async () => {
    await render(<Purchasing />);

    expect(screen.getByText('Purchasing…')).toBeTruthy();
    expect(screen.getByLabelText('Subscribe')).toBeDisabled();
  });

  it('error: inline error near the CTA with an always-visible Retry (AC4)', async () => {
    await render(<PurchaseError />);

    expect(
      screen.getByText('Something went wrong with the purchase — nothing was charged.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Retry')).toBeTruthy();
  });

  it('premium: calm confirmation replaces the CTA entirely (AC2)', async () => {
    await render(<PremiumConfirmation />);

    expect(screen.getByText('You’re premium — enjoy!')).toBeTruthy();
    expect(screen.queryByLabelText('Subscribe')).toBeNull();
    expect(screen.queryByLabelText('Retry')).toBeNull();
  });
});
