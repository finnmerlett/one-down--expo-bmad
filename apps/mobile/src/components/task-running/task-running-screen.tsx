import type { Ref } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import type { SubtaskData, TaskData } from '@one-down/shared';

import type { StepEditCallbacks } from '@/components/task-running/steps-editor';
import {
  TaskRunningView,
  type TaskRunningViewHandle,
} from '@/components/task-running/task-running-view';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, EditIcon, Icon, StarIcon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { StepActionsController } from '@/hooks/use-step-actions';
import type { UpdateTaskPatch } from '@/services/tasks-repository';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole working screen as the user sees it — back button, the star
 * bucket header, the edit entry and the TaskRunningView body — driven
 * entirely by props. src/app/task-running/[id].tsx supplies the data and
 * behaviour; the screen stories (and so the design canvas) supply fixtures.
 */
export function TaskRunningScreen({
  task,
  prize,
  banked,
  onBack,
  onEditPress,
  viewRef,
  onPatch,
  onDone,
  onCutLoose,
  subtasks,
  onToggleSubtask,
  stepActions,
  stepEdits,
  initialNotesOpen,
  initialEditMode,
  initialChangeOpen,
}: {
  task: TaskData;
  /** The whole prize for the task (v1.5 spec §5). */
  prize: number;
  /** Stars already banked by completed steps. */
  banked: number;
  onBack: () => void;
  onEditPress: () => void;
  viewRef?: Ref<TaskRunningViewHandle>;
  onPatch: (patch: UpdateTaskPatch) => void;
  onDone: () => void;
  onCutLoose: () => void;
  subtasks: SubtaskData[];
  onToggleSubtask: (subtask: SubtaskData) => void;
  stepActions: StepActionsController;
  stepEdits: StepEditCallbacks;
  /** TaskRunningView UI-state seeds — screen stories only. */
  initialNotesOpen?: boolean;
  initialEditMode?: boolean;
  initialChangeOpen?: boolean;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-1">
        <Pressable
          accessibilityRole="button"
          aria-label="Pause and go back"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Box className="flex-1" />
        <HStack
          accessible
          accessibilityLabel={`Worth ${prize} stars when done${banked > 0 ? `, ${banked} banked` : ''}`}
          className="items-center gap-[9px]"
        >
          <HStack className="h-8 items-center gap-1.5 rounded-full border border-tertiary-300 bg-tertiary-100 px-[13px]">
            <Text className="text-xs text-tertiary-500">★</Text>
            <Text className="font-mono text-sm leading-none text-tertiary-700">{prize}</Text>
            <Text className="font-body-semibold text-xs text-tertiary-700">when done</Text>
          </HStack>
          {banked > 0 ? (
            <HStack className="items-center gap-1">
              <Icon as={StarIcon} size="2xs" className="text-tertiary-500" />
              <Text className="font-mono text-sm leading-none text-tertiary-700">{banked}</Text>
              <Text className="font-body-semibold text-xs text-tertiary-700">banked</Text>
            </HStack>
          ) : null}
        </HStack>
        <Box className="flex-1" />
        {/* Edit entry (2026-07-27): full editing lives on the task detail —
            this screen is for DOING, so it only ever patches notes. */}
        <Pressable
          accessibilityRole="button"
          aria-label={`Edit task: ${task.title}`}
          hitSlop={8}
          onPress={onEditPress}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={EditIcon} size="lg" className="text-typography-700" />
        </Pressable>
      </HStack>
      <TaskRunningView
        ref={viewRef}
        task={task}
        onPatch={onPatch}
        onDone={onDone}
        onCutLoose={onCutLoose}
        subtasks={subtasks}
        onToggleSubtask={onToggleSubtask}
        stepActions={stepActions}
        stepEdits={stepEdits}
        initialNotesOpen={initialNotesOpen}
        initialEditMode={initialEditMode}
        initialChangeOpen={initialChangeOpen}
      />
    </SafeAreaView>
  );
}
