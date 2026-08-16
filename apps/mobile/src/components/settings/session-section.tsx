import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * "On app open" (Story 9.8, Keep D4): whether the change-context box expands
 * on the session's first home mount, or the stack shows straight away with
 * the previous context. Presentational; the route owns load + persist.
 */
export function SessionSection({
  autoOpen,
  onToggle,
}: {
  autoOpen: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <VStack className="gap-3 rounded-3xl border border-outline-100 bg-background-0 p-5">
      <Text className="font-heading text-lg text-typography-900">On app open</Text>
      <HStack className="min-h-11 items-center justify-between">
        <VStack className="min-w-0 flex-1 gap-0.5 pr-3">
          <Text className="font-body-medium text-base text-typography-900">
            Ask for your context
          </Text>
          <Text className="font-body text-sm text-typography-500">
            Off shows the stack straight away with your previous context.
          </Text>
        </VStack>
        {/* gluestack drops aria-* on Switch — accessibilityLabel is required. */}
        <Switch
          accessibilityLabel="Context box on open toggle"
          value={autoOpen}
          onValueChange={onToggle}
        />
      </HStack>
    </VStack>
  );
}
