import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { PremiumFeaturesView } from './premium-features-view';

const meta = {
  title: 'premium/PremiumFeaturesView',
  component: PremiumFeaturesView,
  decorators: [
    (Story) => (
      <Box className="flex-1 bg-background-0 pt-4" style={{ maxHeight: 640 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof PremiumFeaturesView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Story 8.2a state: purchase flow not wired yet → disabled placeholder CTA. */
export const PlaceholderCta: Story = {};

/** CTA live (8.2b wires the real purchase flow through this prop). */
export const WithSubscribe: Story = {
  args: {
    onSubscribe: () => {},
  },
};

/** Story 8.2b — in-flight purchase: spinner in place on the CTA, disabled. */
export const Purchasing: Story = {
  args: {
    onSubscribe: () => {},
    purchaseStatus: 'purchasing',
  },
};

/** Story 8.2b — failed purchase: inline error + always-visible Retry (AC4). */
export const PurchaseError: Story = {
  args: {
    onSubscribe: () => {},
    purchaseStatus: 'error',
  },
};

/** Story 8.2b — entitled: calm confirmation replaces the CTA (AC2). */
export const PremiumConfirmation: Story = {
  args: {
    purchaseStatus: 'premium',
  },
};
