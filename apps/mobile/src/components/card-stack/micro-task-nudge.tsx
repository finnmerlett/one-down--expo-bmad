import { ActivityIndicator } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Calm micro-task nudge under the card stack (Story 6.4, FR39): a quiet chip
 * for a card the user keeps skipping — no badge, no red, never blocks the
 * card. Presentational; home owns the controller (use-micro-task).
 */
export function MicroTaskNudge({
  state,
  step,
  onRequest,
  onAdd,
  onDismiss,
  onRetry,
}: {
  state: 'idle' | 'loading' | 'proposal' | 'error';
  step: string | null;
  onRequest: () => void;
  onAdd: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (state === 'loading') {
    return (
      <HStack className="items-center justify-center gap-2 px-6 pb-3">
        <ActivityIndicator accessibilityLabel="Finding a tiny first step" />
        <Text className="text-sm text-typography-600">Finding a tiny first step...</Text>
      </HStack>
    );
  }

  if (state === 'error') {
    return (
      <HStack className="items-center justify-center gap-3 px-6 pb-3">
        <Text className="text-sm text-typography-600">Couldn&apos;t fetch a step right now</Text>
        <Button size="xs" variant="outline" aria-label="Retry tiny step" onPress={onRetry}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </HStack>
    );
  }

  if (state === 'proposal' && step) {
    return (
      <VStack className="mx-6 mb-3 gap-2 rounded-2xl border border-outline-100 bg-background-50 p-4">
        <Text className="font-body-semibold text-sm text-typography-900">{step}</Text>
        <HStack className="gap-2">
          <Button size="sm" aria-label="Add it" onPress={onAdd}>
            <ButtonText>Add it</ButtonText>
          </Button>
          <Button size="sm" variant="link" aria-label="No thanks" onPress={onDismiss}>
            <ButtonText>No thanks</ButtonText>
          </Button>
        </HStack>
      </VStack>
    );
  }

  // Idle chip. The tappable affordance is its own labeled button — the
  // question copy stays a plain Text node (visible to Maestro/TalkBack,
  // which an accessible container would swallow).
  return (
    <HStack className="items-center justify-center gap-2 px-6 pb-3">
      <Text className="text-sm text-typography-600">Stuck on this?</Text>
      <Button size="sm" variant="outline" aria-label="Get a tiny first step" onPress={onRequest}>
        <ButtonText>Get a tiny first step</ButtonText>
      </Button>
    </HStack>
  );
}
