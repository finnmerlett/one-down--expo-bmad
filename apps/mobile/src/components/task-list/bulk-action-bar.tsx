import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

import type { TaskListMode } from './task-list-view';

/**
 * Bottom action bar shown while multi-selecting (Story 7.1, AC1):
 * selection count + the tab's bulk actions. Presentational — the screen owns
 * the selection set and dialogs. Buttons disable at count 0 rather than the
 * bar vanishing (no layout jump while toggling). 44pt targets throughout.
 */
export function BulkActionBar({
  count,
  mode,
  onArchive,
  onRestore,
  onDelete,
  onCancel,
}: {
  count: number;
  mode: TaskListMode;
  /** Active tab — archive the selection (the screen decides on the warning). */
  onArchive?: () => void;
  /** Bin tab — restore the selection to the active list. */
  onRestore?: () => void;
  /** Bin tab — permanently delete the selection (always confirmed). */
  onDelete?: () => void;
  /** Exit multi-select, clearing the selection (AC8). */
  onCancel: () => void;
}) {
  return (
    <HStack className="items-center gap-2 rounded-t-[28px] bg-background-0 px-5 py-4 shadow-soft-card">
      <Text className="flex-1 font-body-bold text-base text-typography-900">
        {`${count} selected`}
      </Text>
      {mode === 'active' ? (
        <Button size="lg" isDisabled={count === 0} onPress={onArchive} aria-label="Archive">
          <ButtonText>Archive</ButtonText>
        </Button>
      ) : (
        <>
          <Button
            size="lg"
            variant="outline"
            isDisabled={count === 0}
            onPress={onRestore}
            aria-label="Restore selected"
          >
            <ButtonText>Restore</ButtonText>
          </Button>
          <Button size="lg" isDisabled={count === 0} onPress={onDelete} aria-label="Delete">
            <ButtonText>Delete</ButtonText>
          </Button>
        </>
      )}
      <Button size="lg" variant="outline" onPress={onCancel} aria-label="Exit selection">
        <ButtonText>Cancel</ButtonText>
      </Button>
    </HStack>
  );
}
