import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { Box } from '@/components/ui/box';

import { FloatingAddButton } from './floating-add-button';
import { TopBar } from './top-bar';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

// All four edges: bottom inset keeps the FAB clear of the Android gesture bar.
export function AppShell({
  children,
  onAddPress,
  onListPress,
  starTotals,
  onStarPress,
  onSettingsPress,
}: {
  children: ReactNode;
  onAddPress?: () => void;
  onListPress?: () => void;
  /** Live totals for the top-bar star counter (Story 4.2). */
  starTotals?: { total: number; today: number };
  /** Opens the star activity log (wired in Story 4.3). */
  onStarPress?: () => void;
  /** Opens the settings screen (Story 8.1). */
  onSettingsPress?: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <TopBar
        onListPress={onListPress}
        starTotals={starTotals}
        onStarPress={onStarPress}
        onSettingsPress={onSettingsPress}
      />

      <Box className="flex-1">{children}</Box>
      {/* No handler → no FAB: it paints above the content Box, so screens hide
          it while an overlay (e.g. the expanded card back) is up. */}
      {onAddPress ? <FloatingAddButton onPress={onAddPress} /> : null}
    </SafeAreaView>
  );
}
