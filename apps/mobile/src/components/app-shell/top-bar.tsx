import { List, Settings } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { StarCounter } from './star-counter';
import { SyncIndicator } from './sync-indicator';

export function TopBar({
  onListPress,
  starTotals = { total: 0, today: 0 },
  bankedStars = 0,
  onStarPress,
  onSettingsPress,
}: {
  onListPress?: () => void;
  /** Live totals from useStarTotals (Story 4.2); defaults keep stories db-free. */
  starTotals?: { total: number; today: number };
  /** Net stars banked on active tasks (v1.5 banked cluster; hidden at 0). */
  bankedStars?: number;
  /** Opens the star activity log (wired in Story 4.3). */
  onStarPress?: () => void;
  /** Opens the settings screen (Story 8.1). */
  onSettingsPress?: () => void;
}) {
  // v1.5 frame 02: star cluster sits flush LEFT, list + settings right — no
  // centered pill, no menu burger. The list icon is the escape hatch.
  return (
    <HStack className="items-center justify-between py-2 pl-6 pr-4">
      <StarCounter
        total={starTotals.total}
        today={starTotals.today}
        banked={bankedStars}
        onPress={onStarPress}
      />
      <HStack className="items-center gap-1">
        {/* Only visible while sync is pending/retrying (Story 5.3). */}
        <SyncIndicator />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open task list"
          hitSlop={8}
          onPress={onListPress}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-200"
        >
          <Icon as={List} size="lg" className="text-typography-600" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={8}
          onPress={onSettingsPress}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-200"
        >
          <Icon as={Settings} size="lg" className="text-typography-600" />
        </Pressable>
      </HStack>
    </HStack>
  );
}
