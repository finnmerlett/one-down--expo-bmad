import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';

import { UpdateReadyBannerView } from './update-ready-banner';

const meta = {
  title: 'app-shell/UpdateReadyBanner',
  component: UpdateReadyBannerView,
  decorators: [
    (Story) => (
      <Box className="flex-1 justify-start bg-background-100 p-4">
        <Story />
      </Box>
    ),
  ],
  args: {
    onRestart: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof UpdateReadyBannerView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A downloaded OTA update is ready — one tap swaps the bundle in place. */
export const Ready: Story = {};

/** Mid-reload: the button disables so a double-tap can't race the swap. */
export const Restarting: Story = {
  args: { restarting: true },
};
