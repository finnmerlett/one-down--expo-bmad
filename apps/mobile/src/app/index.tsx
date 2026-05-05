import { AppShell } from '@/components/app-shell/app-shell';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

export default function HomeScreen() {
  return (
    <AppShell
      onTaskListPress={() => {}}
      onStarBoxPress={() => {}}
      onSettingsPress={() => {}}
      onAddPress={() => {}}
    >
      <Box className="flex-1 items-center justify-center px-4">
        <Text className="text-base text-neutral-500">Your tasks will appear here</Text>
      </Box>
    </AppShell>
  );
}
