import type { Ref } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import type { ReviewItem, TaskData } from '@one-down/shared';

import { CardBack, type CardBackHandle } from '@/components/card-stack/card-back';
import { Box } from '@/components/ui/box';
import type { UpdateTaskPatch } from '@/services/tasks-repository';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole task-detail screen as the user sees it — the full-screen card
 * back, floating-card or flat — driven entirely by props.
 * src/app/task/[id].tsx supplies the data and behaviour; the screen stories
 * (and so the design canvas) supply fixtures.
 */
export function TaskDetailScreen({
  task,
  frameless,
  cardBackRef,
  onPatch,
  onConfirm,
  onConfirmAll,
  onKeep,
  onClose,
  onStart,
  onCutLoose,
}: {
  task: TaskData;
  /** Entered from the DOING screen: a plain full-bleed editor, no card chrome. */
  frameless: boolean;
  cardBackRef?: Ref<CardBackHandle>;
  onPatch: (patch: UpdateTaskPatch) => void;
  onConfirm: (item: ReviewItem) => void;
  onConfirmAll: (items: ReviewItem[]) => void;
  onKeep: () => void;
  onClose: () => void;
  onStart: () => void;
  onCutLoose: () => void;
}) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className={frameless ? 'flex-1 bg-background-0' : 'flex-1 bg-background-100'}
    >
      <Box className={frameless ? 'flex-1' : 'flex-1 p-3'}>
        <CardBack
          frameless={frameless}
          ref={cardBackRef}
          task={task}
          onPatch={onPatch}
          onConfirm={onConfirm}
          onConfirmAll={onConfirmAll}
          onKeep={onKeep}
          onClose={onClose}
          onStart={onStart}
          onCutLoose={onCutLoose}
          backLabel={frameless ? 'Back to task' : 'Back to task list'}
        />
      </Box>
    </SafeAreaView>
  );
}
