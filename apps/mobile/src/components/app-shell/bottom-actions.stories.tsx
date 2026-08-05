import type { Meta, StoryObj } from '@storybook/react';

import { BottomActions } from './bottom-actions';

const meta = {
  title: 'app-shell/BottomActions',
  component: BottomActions,
  args: {
    onAddPress: () => {},
    onBrainDumpPress: () => {},
  },
} satisfies Meta<typeof BottomActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Expanded Right-now sheet state — the dashed triage entry joins on the left. */
export const WithTriageEntry: Story = {
  args: {
    showTriage: true,
    triageCount: 8,
    onTriagePress: () => {},
  },
};
