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

/** Non-empty check queue — the dashed triage entry joins on the left
 *  (9-5 item 6: it stands whenever there are cards to triage). */
export const WithTriageEntry: Story = {
  args: {
    triageCount: 8,
    onTriagePress: () => {},
  },
};
