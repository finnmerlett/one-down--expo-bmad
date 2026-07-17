import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState, type ReactNode } from 'react';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useEntitlementsStore } from '@/stores/entitlements-store';

import { SparkleBadge } from './sparkle-badge';

// Gate rendering until the zustand store holds the story's entitlement state,
// and reset it on unmount — leaked premium state would silently blank the
// sparkle in every later story/test (Modal-story local-state discipline).
function EntitlementState({ isPremium, children }: { isPremium: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useEntitlementsStore.setState({ isPremium });
    setReady(true);
    return () => useEntitlementsStore.setState({ isPremium: false });
  }, [isPremium]);
  return ready ? <>{children}</> : null;
}

const meta = {
  title: 'premium/SparkleBadge',
  component: SparkleBadge,
  decorators: [
    (Story) => (
      <Box className="flex-1 items-center justify-center bg-background-0">
        <Story />
      </Box>
    ),
  ],
  args: {
    feature: 'ai_breakdown',
  },
} satisfies Meta<typeof SparkleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Free tier — the tappable discovery sparkle. */
export const FreeTier: Story = {
  decorators: [
    (Story) => (
      <EntitlementState isPremium={false}>
        <Story />
      </EntitlementState>
    ),
  ],
};

/** Premium — the badge renders NOTHING (AC4); the caption is story chrome. */
export const PremiumHidesBadge: Story = {
  decorators: [
    (Story) => (
      <EntitlementState isPremium={true}>
        <Text className="text-xs text-typography-400">(no sparkle should render below)</Text>
        <Story />
      </EntitlementState>
    ),
  ],
};
