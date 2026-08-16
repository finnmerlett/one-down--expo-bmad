import type { Meta, StoryObj } from '@storybook/react';

import { SessionSection } from './session-section';

const meta = {
  title: 'settings/SessionSection',
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
