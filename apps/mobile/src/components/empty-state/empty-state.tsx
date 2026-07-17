import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Shared empty-state guidance (Story 3.4, UX P1 component "EmptyState").
 * Calm and factual — no red, no guilt (ADHD copy principles). At most one
 * CTA (one primary action per screen); rendering it needs BOTH the label
 * and the handler.
 */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <VStack className="flex-1 items-center justify-center gap-2 px-8">
      <Text className="text-center font-medium text-typography-900">{title}</Text>
      <Text className="text-center text-typography-500">{body}</Text>
      {actionLabel && onAction ? (
        // gluestack creator components take aria-label, not accessibilityLabel.
        <Button size="lg" className="mt-4" aria-label={actionLabel} onPress={onAction}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </VStack>
  );
}
