import { AppButton } from '@/components/ui/app-button';
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
  glyph = '✨',
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  /** Big friendly emoji above the copy — decorative, hidden from a11y. */
  glyph?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <VStack className="flex-1 items-center justify-center gap-2 px-8">
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        className="mb-2 text-center text-6xl leading-[72px]"
      >
        {glyph}
      </Text>
      {/* 9.8 A8: both copy lines a step smaller — this screen read louder
          than the brain dump. */}
      <Text className="text-center font-heading text-xl text-typography-900">{title}</Text>
      <Text className="text-center text-sm text-typography-500">{body}</Text>
      {actionLabel && onAction ? (
        <AppButton
          kind="primary-compact"
          className="mt-4"
          aria-label={actionLabel}
          label={actionLabel}
          onPress={onAction}
        />
      ) : null}
    </VStack>
  );
}
