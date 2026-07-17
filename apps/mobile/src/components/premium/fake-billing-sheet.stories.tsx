import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { useFakeBillingStore } from '@/stores/fake-billing-store';

import { FakeBillingSheet } from './fake-billing-sheet';

const meta = {
  title: 'premium/FakeBillingSheet',
  component: FakeBillingSheet,
} satisfies Meta<typeof FakeBillingSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// The sheet is a real native Modal driven by the global fake-billing store
// (QuickAddSheet Modal learning): a request opens on mount so the dialog is
// visible (portable-story tests rely on it), settling any choice closes it so
// on-device Storybook stays usable, and the button relaunches the request.
export const PendingRequest: Story = {
  render: function Render() {
    useEffect(() => {
      void useFakeBillingStore.getState().open();
      return () => useFakeBillingStore.getState().settle('cancel');
    }, []);
    return (
      <Box className="flex-1 justify-center p-6">
        <Button
          aria-label="Reopen test billing"
          onPress={() => void useFakeBillingStore.getState().open()}
        >
          <ButtonText>Reopen test billing</ButtonText>
        </Button>
        <FakeBillingSheet />
      </Box>
    );
  },
};
