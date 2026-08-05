import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

import { AppShell } from './app-shell';
import { BottomActions } from './bottom-actions';

const meta = {
  title: 'app-shell/AppShell',
  component: AppShell,
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HomeScreen: Story = {
  args: {
    // Screens pass the standing bottom actions as the footer slot (v1.5) —
    // and drop it while an overlay is up.
    footer: <BottomActions onAddPress={() => {}} onBrainDumpPress={() => {}} />,
    children: (
      <Box className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-typography-400">Your tasks will appear here</Text>
      </Box>
    ),
  },
};
