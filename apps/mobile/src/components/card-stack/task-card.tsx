import {
  parseTaskContexts,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon, InfoIcon, StarIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const SIZE_LABELS: Record<TaskSize, string> = {
  quick_win: 'Quick win',
  big_time: 'Big time',
};

// Record<TaskContext, …> so adding a context to the shared union forces a
// label here; lookups stay tolerant of unknown stored values (fall back raw).
export const CONTEXT_LABELS: Record<TaskContext, string> = {
  home: 'Home',
  out_and_about: 'Out & about',
  phone: 'Phone',
  laptop: 'Laptop',
  internet: 'Internet',
};

// Card front (Story 1.4 adds the back). Fills whatever frame the stack gives
// it. `starValue` is computed in the home layer (star-calculator) so the card
// stays presentational.
export function TaskCard({ task, starValue }: { task: TaskData; starValue: number }) {
  const contexts = parseTaskContexts(task.contexts);
  const inProgress = task.status === 'in_progress';

  return (
    <Box className="h-full w-full rounded-3xl border border-outline-200 bg-background-0 p-6 shadow-hard-2">
      {/* Review marker (Story 6.2): visual only — the interactive tap target
          lives in the stack layer, above the swipe gesture (the top card is
          an accessible container, so an inner button would be flattened away
          from TalkBack/Maestro). */}
      {task.hasCheckNeeded ? (
        <Box className="absolute right-4 top-4">
          <Icon as={InfoIcon} size="xl" className="text-warning-600" />
        </Box>
      ) : null}
      <VStack className="gap-4">
        <Text className="text-2xl font-semibold text-typography-900">{task.title}</Text>
        <HStack className="flex-wrap items-center gap-2">
          {/* Star-value chip (FR11): a reward preview, not a priority label —
              urgency shows as value, never as red/overdue framing. */}
          <HStack className="items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1">
            <Icon as={StarIcon} size="sm" className="text-warning-600" />
            <Text className="text-sm font-medium text-warning-700">{starValue}</Text>
          </HStack>
          {/* In-progress state marker (UX: card shows "Continue" on return). */}
          {inProgress ? (
            <Badge action="success" variant="solid">
              <BadgeText>Continue</BadgeText>
            </Badge>
          ) : null}
          {task.size ? (
            <Badge action="info" variant="outline">
              <BadgeText>{SIZE_LABELS[task.size]}</BadgeText>
            </Badge>
          ) : null}
          {contexts.map((context) => (
            <Badge key={context} action="muted" variant="outline">
              <BadgeText>
                {(CONTEXT_LABELS as Record<string, string>)[context] ?? context}
              </BadgeText>
            </Badge>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
}
