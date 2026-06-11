import { ScrollView } from 'react-native';

import { AppShell } from '@/components/app-shell/app-shell';
import { QuickAddSheet } from '@/components/quick-add-sheet/quick-add-sheet';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useTasks } from '@/hooks/use-tasks';
import { track } from '@/lib/analytics/track';
import { db } from '@/lib/local-db';
import { createTask, type CreateTaskInput } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

export default function HomeScreen() {
  const isOpen = useQuickAddStore((state) => state.isOpen);
  const open = useQuickAddStore((state) => state.open);
  const close = useQuickAddStore((state) => state.close);
  const tasks = useTasks();

  const handleSubmit = async (input: CreateTaskInput) => {
    const task = await createTask(db, input);
    track('task_created', { source: 'quick_add', has_details: task.details !== null });
  };

  return (
    <AppShell onAddPress={open}>
      {tasks.length === 0 ? (
        <Box className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-typography-400">Your tasks will appear here</Text>
        </Box>
      ) : (
        // Interim flat list — replaced by the card stack in Story 1.3.
        <ScrollView className="flex-1 px-4">
          <VStack className="gap-2 py-2">
            {tasks.map((task) => (
              <Box
                key={task.id}
                className="rounded-xl border border-outline-100 bg-background-50 px-4 py-3"
              >
                <Text className="text-typography-900">{task.title}</Text>
              </Box>
            ))}
          </VStack>
        </ScrollView>
      )}
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </AppShell>
  );
}
