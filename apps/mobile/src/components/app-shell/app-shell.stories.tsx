import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

import { AppShell } from './app-shell';

const meta = {
  title: 'app-shell/AppShell',
  component: AppShell,
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomeScreen: Story = {
  args: {
    children: (
      <Box className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-typography-400">Your tasks will appear here</Text>
      </Box>
    ),
  },
};
