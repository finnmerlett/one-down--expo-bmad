import { HStack } from '@/components/ui/hstack';
import { Icon, StarIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

// Placeholder: live star totals + the activity log screen land in Epic 4 (Story 4.2).
export function StarBoxPlaceholder() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View star activity"
      hitSlop={8}
      className="rounded-lg border border-outline-200 bg-background-50 px-3 py-1.5 active:bg-background-100"
    >
      <HStack className="items-center gap-1.5">
        <Icon as={StarIcon} size="sm" className="text-warning-400" />
        <Text className="text-sm font-medium text-typography-700">0</Text>
      </HStack>
    </Pressable>
  );
}
