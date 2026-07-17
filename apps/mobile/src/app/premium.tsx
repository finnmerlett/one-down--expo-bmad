import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import {
  PremiumFeaturesView,
  type PurchaseStatus,
} from '@/components/premium/premium-features-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useIsPremium } from '@/hooks/use-is-premium';
import { purchasePremium, restorePurchases } from '@/services/entitlements/entitlements-service';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

export default function PremiumScreen() {
  const router = useRouter();
  const isPremium = useIsPremium();

  // Page-local purchase state machine (Story 8.2b): idle | purchasing |
  // error | premium. Premium derives from the store, so an already-premium
  // visitor sees the confirmation, not the CTA.
  const [purchasing, setPurchasing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState(false);

  const purchaseStatus: PurchaseStatus = isPremium
    ? 'premium'
    : purchasing
      ? 'purchasing'
      : failed
        ? 'error'
        : 'idle';

  const handleSubscribe = () => {
    if (purchasing) return;
    setPurchasing(true);
    void purchasePremium()
      .then((result) => {
        // Cancelled → back to the page unchanged: no error UI (AC3).
        setFailed(result.outcome === 'failed');
      })
      .catch(() => setFailed(true))
      .finally(() => setPurchasing(false));
  };

  const handleRestore = () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreNote(false);
    void restorePurchases()
      .then(({ restored }) => {
        // Restored → the store flip shows the confirmation; nothing to
        // restore → calm inline note (AC5).
        setRestoreNote(!restored);
      })
      .catch(() => setRestoreNote(true))
      .finally(() => setRestoring(false));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
      </HStack>
      <PremiumFeaturesView
        purchaseStatus={purchaseStatus}
        onSubscribe={handleSubscribe}
        footer={
          isPremium ? undefined : (
            <VStack className="items-center gap-1 pt-2">
              <Pressable
                accessibilityRole="button"
                aria-label="Restore purchases"
                hitSlop={8}
                onPress={handleRestore}
                className="min-h-11 items-center justify-center"
              >
                <Text className="text-sm font-medium text-primary-600">
                  {restoring ? 'Restoring…' : 'Restore purchases'}
                </Text>
              </Pressable>
              {restoreNote ? (
                <Text className="text-sm text-typography-500">No previous purchase found.</Text>
              ) : null}
            </VStack>
          )
        }
      />
    </SafeAreaView>
  );
}
