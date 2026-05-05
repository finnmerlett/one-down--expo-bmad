import { Star } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

export type StarBoxPlaceholderProps = {
  onPress?: () => void;
};

export function StarBoxPlaceholder({ onPress }: StarBoxPlaceholderProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View star activity"
      accessibilityLiveRegion="polite"
      onPress={onPress}
      className="min-h-[44px] min-w-[44px] flex-row items-center justify-center px-3 py-2"
    >
      <HStack className="items-center gap-1">
        <Icon as={Star} size={18} color="#888" />
        <Text className="text-base text-neutral-500">0</Text>
      </HStack>
    </Pressable>
  );
}
