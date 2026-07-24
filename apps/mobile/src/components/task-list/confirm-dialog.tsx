import { Modal } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Confirmation dialog (Story 7.1) — RN Modal per the landed FakeBillingSheet
 * pattern (no gluestack alert-dialog in the ui/ set; hand-rolled keeps the
 * dependency surface unchanged). Backdrop tap and hardware back both cancel:
 * dismissing takes no action and preserves the selection (AC7).
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelAccessibilityLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  /** Visible text AND a11y label of the confirm button (e.g. "Archive anyway"). */
  confirmLabel: string;
  /** Distinct a11y label for Cancel so selectors never collide with the bulk bar's Cancel. */
  cancelAccessibilityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        aria-label="Dismiss dialog"
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-background-950/40 px-8"
      >
        {/* Inner pressable swallows taps so dialog content doesn't dismiss. */}
        <Pressable onPress={() => {}} className="w-full max-w-96">
          <Box className="gap-4 rounded-2xl bg-background-0 p-6 shadow-hard-2">
            <VStack className="gap-1">
              <Text className="text-lg font-semibold text-typography-900">{title}</Text>
              <Text className="text-base text-typography-600">{body}</Text>
            </VStack>
            <VStack className="gap-3">
              <Button size="lg" onPress={onConfirm} aria-label={confirmLabel}>
                <ButtonText>{confirmLabel}</ButtonText>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onPress={onCancel}
                aria-label={cancelAccessibilityLabel}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
            </VStack>
          </Box>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
