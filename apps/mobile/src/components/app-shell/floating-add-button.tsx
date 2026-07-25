import { AddIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

export function FloatingAddButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add task"
      hitSlop={8}
      onPress={onPress}
      className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-primary-500 shadow-fab active:bg-primary-600"
    >
      <Icon as={AddIcon} size="xl" className="text-typography-0" />
    </Pressable>
  );
}
