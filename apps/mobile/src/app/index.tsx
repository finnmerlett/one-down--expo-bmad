import { AppShell } from '@/components/app-shell/app-shell';
import { CardStack } from '@/components/card-stack/card-stack';
import { ConnectionStatus } from '@/components/connection-status';
import {
  QuickAddSheet,
  type QuickAddSubmitInput,
} from '@/components/quick-add-sheet/quick-add-sheet';
import { Box } from '@/components/ui/box';
import { useLocalDb } from '@/hooks/use-local-db';
import { useCuratedTasks } from '@/hooks/use-tasks';
import { createTask } from '@/services/tasks-repository';
import { useQuickAddStore } from '@/stores/quick-add-store';

export default function HomeScreen() {
  const db = useLocalDb();
  const cards = useCuratedTasks();
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
        <CardStack cards={cards} />
        <Box className="items-center pb-3">
          <ConnectionStatus />
        </Box>
      </AppShell>
      <QuickAddSheet isOpen={isOpen} onClose={close} onSubmit={handleSubmit} />
    </>
  );
}
