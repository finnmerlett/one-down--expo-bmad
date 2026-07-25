import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon, MenuIcon, SettingsIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { StarCounter } from './star-counter';
import { SyncIndicator } from './sync-indicator';

export function TopBar({
  onListPress,
  starTotals = { total: 0, today: 0 },
  onStarPress,
  onSettingsPress,
}: {
  onListPress?: () => void;
  /** Live totals from useStarTotals (Story 4.2); defaults keep stories db-free. */
  starTotals?: { total: number; today: number };
  /** Opens the star activity log (wired in Story 4.3). */
  onStarPress?: () => void;
  /** Opens the settings screen (Story 8.1). */
  onSettingsPress?: () => void;
}) {
  // menu — star pill — settings, evenly aligned: fixed-width side slots keep
  // the pill optically centered (the transient sync glyph tucks beside
  // settings without shoving the pill around).
  return (
    <HStack className="items-center justify-between px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open task list"
        hitSlop={8}
        onPress={onListPress}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-background-200"
      >
        <Icon as={MenuIcon} size="xl" className="text-typography-800" />
      </Pressable>
      <Box className="flex-1 items-center">
        <StarCounter total={starTotals.total} today={starTotals.today} onPress={onStarPress} />
      </Box>
      <HStack className="items-center">
        {/* Only visible while sync is pending/retrying (Story 5.3). */}
        <SyncIndicator />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={8}
          onPress={onSettingsPress}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-200"
        >
          <Icon as={SettingsIcon} size="xl" className="text-typography-800" />
        </Pressable>
      </HStack>
    </HStack>
  );
}
