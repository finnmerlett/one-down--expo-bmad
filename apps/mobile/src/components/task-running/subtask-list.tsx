import type { SubtaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { CheckIcon, Icon, TrashIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Live subtask list on the task running screen (Story 6.3, AC4).
 * Presentational: rows expose checkbox semantics (`Subtask: <title>` +
 * checked state — Maestro selects on both) and a delete button. Completing
 * is reversible; completed rows strike through and fade, never disappear.
 */
export function SubtaskList({
  subtasks,
  onToggle,
  onDelete,
}: {
  subtasks: SubtaskData[];
  onToggle?: (subtask: SubtaskData) => void;
  onDelete?: (subtask: SubtaskData) => void;
}) {
  if (subtasks.length === 0) return null;

  return (
    <VStack className="gap-1">
      <Text className="text-sm font-medium text-typography-500">Steps</Text>
      {subtasks.map((subtask) => (
        <HStack key={subtask.id} className="items-center gap-1">
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: subtask.completed }}
            aria-label={`Subtask: ${subtask.title}`}
            onPress={() => onToggle?.(subtask)}
            className="min-h-11 flex-1 flex-row items-center gap-3"
          >
            <Box
              className={`h-6 w-6 items-center justify-center rounded-md border ${
                subtask.completed
                  ? 'border-primary-700 bg-primary-600'
                  : 'border-outline-400 bg-background-0'
              }`}
            >
              {subtask.completed ? (
                <Icon as={CheckIcon} size="sm" className="text-typography-0" />
              ) : null}
            </Box>
            <Text
              className={
                subtask.completed
                  ? 'flex-1 text-base text-typography-400 line-through'
                  : 'flex-1 text-base text-typography-900'
              }
            >
              {subtask.title}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            aria-label={`Delete subtask: ${subtask.title}`}
            hitSlop={8}
            onPress={() => onDelete?.(subtask)}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <Icon as={TrashIcon} size="md" className="text-typography-400" />
          </Pressable>
        </HStack>
      ))}
    </VStack>
  );
}
