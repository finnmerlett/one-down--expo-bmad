import { Modal } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useFakeBillingStore } from '@/stores/fake-billing-store';

// Local mode has no billing key, so the failure simulator is always visible
// (Maestro drives it against the release APK); with a real key it is a
// dev-only affordance.
const SHOW_SIMULATE_FAILURE = __DEV__ || !process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

/**
 * The FAKE billing sheet (Story 8.2b, local mode) — clearly labelled "Test
 * billing", deliberately NOT imitating Google Play UI. Mounted once in the
 * root layout; renders while the fake provider has a pending purchase
 * request. Backdrop tap and hardware back both mean Cancel — cancellation is
 * not an error (AC3).
 */
export function FakeBillingSheet() {
  const request = useFakeBillingStore((state) => state.request);
  const settle = useFakeBillingStore((state) => state.settle);

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      onRequestClose={() => settle('cancel')}
    >
      <Pressable
        aria-label="Dismiss test billing"
        onPress={() => settle('cancel')}
        className="flex-1 items-center justify-center bg-background-950/40 px-8"
      >
        {/* Inner pressable swallows taps so card content doesn't dismiss. */}
        <Pressable onPress={() => {}} className="w-full max-w-96">
          <Box className="gap-4 rounded-2xl bg-background-0 p-6 shadow-hard-2">
            <VStack className="gap-1">
              <Text className="text-lg font-semibold text-typography-900">
                Test billing · One Down Premium
              </Text>
              <Text className="text-base text-typography-600">£1.50 / month</Text>
            </VStack>
            <VStack className="gap-3">
              <Button size="lg" onPress={() => settle('buy')} aria-label="Buy">
                <ButtonText>Buy</ButtonText>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onPress={() => settle('cancel')}
                aria-label="Cancel"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              {SHOW_SIMULATE_FAILURE ? (
                <Pressable
                  accessibilityRole="button"
                  aria-label="Simulate failure"
                  hitSlop={8}
                  onPress={() => settle('fail')}
                  className="min-h-11 items-center justify-center"
                >
                  <Text className="text-sm text-typography-500">Simulate failure</Text>
                </Pressable>
              ) : null}
            </VStack>
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
