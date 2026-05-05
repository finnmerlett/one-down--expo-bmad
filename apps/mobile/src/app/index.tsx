import { AppShell } from '@/components/app-shell/app-shell';
import {
  QuickAddSheet,
  type QuickAddSubmitInput,
} from '@/components/quick-add-sheet/quick-add-sheet';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useLocalDb } from '@/hooks/use-local-db';
import { useMostRecentTask } from '@/hooks/use-tasks';
import { createTask } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

function TaskPreview() {
  const task = useMostRecentTask();
  if (!task) {
    return <Text className="text-base text-neutral-500">Your tasks will appear here</Text>;
  }
  return (
    <Box
      className="w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      accessibilityLabel="Most recent task"
    >
      <Text className="text-sm uppercase tracking-wide text-neutral-500">Most recent task</Text>
      <Text className="mt-1 text-lg font-semibold text-neutral-900">{task.title}</Text>
    </Box>
  );
}

export default function HomeScreen() {
  const db = useLocalDb();
  const isOpen = useQuickAddStore((s) => s.isOpen);
  const open = useQuickAddStore((s) => s.open);
  const close = useQuickAddStore((s) => s.close);

  const handleSubmit = async (input: QuickAddSubmitInput) => {
    createTask(db, { title: input.title, details: input.details });
  };

  return (
    <>
      <AppShell
        onTaskListPress={() => {}}
        onStarBoxPress={() => {}}
        onSettingsPress={() => {}}
        onAddPress={open}
      >
        <Box className="flex-1 items-center justify-center px-4">
          <TaskPreview />
        </Box>
      </AppShell>
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </>
  );
}
