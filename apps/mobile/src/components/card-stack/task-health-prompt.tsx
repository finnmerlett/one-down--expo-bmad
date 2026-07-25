import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

import type { TaskHealthFlag } from '@/services/task-health';

// Gentle nudging, never demanding (UX principles): one line of no-shame copy
// per flag — an inline panel the user is free to ignore, never a modal.
// Exported for the Maestro flow / tests to assert the exact copy.
export const PROMPT_COPY: Record<TaskHealthFlag, string> = {
  stale: "This one's been waiting a while. Still worth doing?",
  avoided: 'You keep skipping this one. No judgement — what would help?',
};

/**
 * Task-health prompt (Story 7.2, AC5) — rendered by CardBack above the
 * action buttons when the task is flagged. Presentational: flag + three
 * callbacks. "Cut loose from prompt" a11y label keeps Maestro/TalkBack
 * selectors distinct from the card back's own Cut loose button; 44pt targets.
 */
export function TaskHealthPrompt({
  flag,
  onKeep,
  onCutLoose,
  onBreakDown,
}: {
  flag: TaskHealthFlag;
  onKeep?: () => void;
  onCutLoose?: () => void;
  /** Starts the task and opens the running screen (where "Help me with this" lives). */
  onBreakDown?: () => void;
}) {
  return (
    <Box className="gap-3 rounded-2xl border border-outline-100 bg-background-50 p-4">
      <Text className="font-body-medium text-sm text-typography-700">{PROMPT_COPY[flag]}</Text>
      <HStack className="flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          isDisabled={!onKeep}
          onPress={onKeep}
          aria-label="Keep it"
        >
          <ButtonText>Keep it</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="outline"
          isDisabled={!onCutLoose}
          onPress={onCutLoose}
          aria-label="Cut loose from prompt"
        >
          <ButtonText>Cut loose</ButtonText>
        </Button>
        <Button
          size="sm"
          variant="outline"
          isDisabled={!onBreakDown}
          onPress={onBreakDown}
          aria-label="Break it down"
        >
          <ButtonText>Break it down</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}
