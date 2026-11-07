import type { Meta, StoryObj } from '@storybook/react';

import { SessionSection } from './session-section';

const meta = {
  title: 'settings/SessionSection',
  // Shown in context by the screens/Settings screen stories; kept for tests.
  parameters: { canvas: { library: false } },
  component: SessionSection,
  args: {
    onToggle: () => {},
  },
} satisfies Meta<typeof SessionSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AskOnOpen: Story = {
  args: { autoOpen: true },
};

export const StraightToStack: Story = {
  args: { autoOpen: false },
};
