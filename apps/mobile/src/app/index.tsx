import { AppShell } from '@/components/app-shell/app-shell';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

export default function HomeScreen() {
  return (
    <AppShell>
      <Box className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-typography-400">Your tasks will appear here</Text>
      </Box>
    </AppShell>
  );
}
