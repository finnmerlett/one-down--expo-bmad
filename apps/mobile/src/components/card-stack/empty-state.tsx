import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

export function EmptyState() {
  return (
    <Box className="flex-1 items-center justify-center px-8" accessibilityLabel="No tasks">
      <Text className="text-center text-lg font-semibold text-neutral-700">No tasks yet</Text>
      <Text className="mt-2 text-center text-sm text-neutral-500">
        Tap the + button to add your first task
      </Text>
    </Box>
  );
}
