import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PremiumFeaturesView,
  type PurchaseStatus,
} from '@/components/premium/premium-features-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole premium page as the user sees it — back button, the features
 * view with its purchase CTA, and the restore-purchases footer — driven
 * entirely by props. src/app/premium.tsx owns the purchase state machine;
 * the screen stories (and so the design canvas) supply fixtures. The fake
 * billing sheet is NOT part of this screen: it is mounted once in the root
 * layout.
 */
export function PremiumScreen({
  onBack,
  isPremium,
  purchaseStatus,
  onSubscribe,
  restoring,
  restoreNote,
  onRestore,
}: {
  onBack: () => void;
  isPremium: boolean;
  purchaseStatus: PurchaseStatus;
  /** Omitted → the disabled placeholder CTA (PremiumFeaturesView contract). */
  onSubscribe?: () => void;
  restoring: boolean;
  /** Show the "No previous purchase found." note. */
  restoreNote: boolean;
  onRestore: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
      </HStack>
      <PremiumFeaturesView
        purchaseStatus={purchaseStatus}
        onSubscribe={onSubscribe}
        footer={
          isPremium ? undefined : (
            <VStack className="items-center gap-1 pt-2">
              <Pressable
                accessibilityRole="button"
                aria-label="Restore purchases"
                hitSlop={8}
                onPress={onRestore}
                className="min-h-11 items-center justify-center"
              >
                <Text className="font-body-bold text-sm text-primary-600">
                  {restoring ? 'Restoring…' : 'Restore purchases'}
                </Text>
              </Pressable>
              {restoreNote ? (
                <Text className="font-body text-sm text-typography-500">
                  No previous purchase found.
                </Text>
              ) : null}
            </VStack>
          )
        }
      />
    </SafeAreaView>
  );
}
