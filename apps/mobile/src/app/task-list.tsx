import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { TaskListView } from '@/components/task-list/task-list-view';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTasks } from '@/hooks/use-tasks';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

export default function TaskListScreen() {
  const router = useRouter();
  const tasks = useTasks();

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-0">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="text-xl font-semibold text-typography-900">Tasks</Text>
      </HStack>
      <TaskListView tasks={tasks} onTaskPress={(task) => router.push(`/task/${task.id}`)} />
    </SafeAreaView>
  );
}
