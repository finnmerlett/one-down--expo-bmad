import { List, Settings } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { StarBoxPlaceholder } from './star-box-placeholder';

export type TopBarProps = {
  onTaskListPress?: () => void;
  onStarBoxPress?: () => void;
  onSettingsPress?: () => void;
};

export function TopBar({ onTaskListPress, onStarBoxPress, onSettingsPress }: TopBarProps) {
  return (
    <HStack className="w-full items-center justify-between px-4 py-2">
      <HStack className="items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open task list"
          onPress={onTaskListPress}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Icon as={List} size={24} color="#222" />
        </Pressable>
        <StarBoxPlaceholder onPress={onStarBoxPress} />
      </HStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        onPress={onSettingsPress}
        className="min-h-[44px] min-w-[44px] items-center justify-center"
      >
        <Icon as={Settings} size={24} color="#222" />
      </Pressable>
    </HStack>
  );
}
