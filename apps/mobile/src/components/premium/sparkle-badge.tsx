import { router } from 'expo-router';

import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { premiumFeatureTitle, type PremiumFeatureId } from '@/constants/premium-features';
import { useIsPremium } from '@/hooks/use-is-premium';
import { track } from '@/lib/analytics/track';

import { SparklesIcon } from './sparkles-icon';

/**
 * Tappable premium marker (Story 8.2a). An INVITATION, not a lock: it sits
 * beside a gated feature, never disables it, and opens the premium page on
 * tap. Renders nothing once the user is premium (AC4).
 */
export function SparkleBadge({ feature }: { feature: PremiumFeatureId }) {
  const isPremium = useIsPremium();
  if (isPremium) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Premium feature: ${premiumFeatureTitle(feature)}`}
      hitSlop={8}
      onPress={() => {
        track('premium_sparkle_tapped', { feature });
        router.push('/premium');
      }}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
    >
      <Icon as={SparklesIcon} size="md" className="text-primary-600" />
    </Pressable>
  );
}
