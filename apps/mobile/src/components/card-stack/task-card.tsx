import {
  parseTaskContexts,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
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

// Card front (Story 1.4 adds the back). Fills whatever frame the stack gives it.
export function TaskCard({ task }: { task: TaskData }) {
  const contexts = parseTaskContexts(task.contexts);
  const inProgress = task.status === 'in_progress';

  return (
    <Box className="h-full w-full rounded-3xl border border-outline-200 bg-background-0 p-6 shadow-hard-2">
      <VStack className="gap-4">
        <Text className="text-2xl font-semibold text-typography-900">{task.title}</Text>
        {inProgress || task.size || contexts.length > 0 ? (
          <HStack className="flex-wrap gap-2">
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
        ) : null}
      </VStack>
    </Box>
  );
}
