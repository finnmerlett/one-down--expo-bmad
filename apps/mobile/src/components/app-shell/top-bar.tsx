import { HStack } from '@/components/ui/hstack';
import { Icon, MenuIcon, SettingsIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { StarBoxPlaceholder } from './star-box-placeholder';

// Remaining placeholder icon buttons until their screens land: star activity
// log (4.2), settings (Epic 8).
export function TopBar({ onListPress }: { onListPress?: () => void }) {
  return (
    <HStack className="items-center justify-between px-4 py-2">
      <HStack className="items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open task list"
          hitSlop={8}
          onPress={onListPress}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={MenuIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <StarBoxPlaceholder />
      </HStack>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
      >
        <Icon as={SettingsIcon} size="xl" className="text-typography-900" />
      </Pressable>
    </HStack>
  );
}
