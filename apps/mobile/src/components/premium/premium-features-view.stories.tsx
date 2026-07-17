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
