import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';

import { FloatingAddButton } from './floating-add-button';
import { TopBar } from './top-bar';

export type AppShellProps = {
  children: ReactNode;
  onTaskListPress?: () => void;
  onStarBoxPress?: () => void;
  onSettingsPress?: () => void;
  onAddPress?: () => void;
};

export function AppShell({
  children,
  onTaskListPress,
  onStarBoxPress,
  onSettingsPress,
  onAddPress,
}: AppShellProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
      <Box className="flex-1 bg-white">
        <TopBar
          onTaskListPress={onTaskListPress}
          onStarBoxPress={onStarBoxPress}
          onSettingsPress={onSettingsPress}
        />
        <Box className="flex-1">{children}</Box>
        <FloatingAddButton onPress={onAddPress} />
      </Box>
    </SafeAreaView>
  );
}
