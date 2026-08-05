import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { Box } from '@/components/ui/box';

import { TopBar } from './top-bar';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// All four edges: bottom inset keeps the footer clear of the Android gesture bar.
export function AppShell({
  children,
  footer,
  onListPress,
  starTotals,
  bankedStars,
  onStarPress,
  onSettingsPress,
}: {
  children: ReactNode;
  /** Standing bottom actions (v1.5) — screens pass <BottomActions/> or nothing. */
  footer?: ReactNode;
  onListPress?: () => void;
  /** Live totals for the top-bar star counter (Story 4.2). */
  starTotals?: { total: number; today: number };
  /** Net stars banked on active tasks (v1.5 counter cluster). */
  bankedStars?: number;
  /** Opens the star activity log (wired in Story 4.3). */
  onStarPress?: () => void;
  /** Opens the settings screen (Story 8.1). */
  onSettingsPress?: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <TopBar
        onListPress={onListPress}
        starTotals={starTotals}
        bankedStars={bankedStars}
        onStarPress={onStarPress}
        onSettingsPress={onSettingsPress}
      />

      <Box className="flex-1">{children}</Box>
      {footer}
    </SafeAreaView>
  );
}
