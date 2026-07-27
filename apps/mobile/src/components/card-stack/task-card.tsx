import {
  parseTaskContexts,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { CalendarDaysIcon, EditIcon, Icon, InfoIcon, StarIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { evaluateTaskHealth, type TaskHealthFlag } from '@/services/task-health';

export const SIZE_LABELS: Record<TaskSize, string> = {
  quick_win: 'Quick win',
  big_time: 'Big time',
};

// Health indicator copy (Story 7.2, AC6) — small and non-alarming, shared by
// the card front chip, the stack's a11y label, and 7.3's triage reason chips.
export const HEALTH_LABELS: Record<TaskHealthFlag, string> = {
  stale: 'Been a while',
  avoided: 'Skipped a lot',
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
  // Health chip (Story 7.2, AC6): computed at render time — cheap, and the
  // live query re-renders the card whenever the underlying fields change.
  const healthFlag = evaluateTaskHealth(task, new Date());

  const deadlineHint = task.deadline
    ? task.deadline.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;
  const notesHint = task.notes?.trim() ? task.notes.trim().split('\n')[0] : null;

  return (
    <Box className="h-full w-full rounded-[28px] border border-outline-100 bg-background-0 p-6 shadow-soft-card">
      <VStack className="h-full justify-between">
        <VStack className="gap-4">
          {/* Corner markers: edit pencil top-left (2026-07-27: tap-to-edit
              moved here — tapping the card itself opens the working screen)
              and the review marker top-right (Story 6.2). Both are VISUAL
              only — the interactive tap targets live in the stack layer,
              above the swipe gesture (the top card is an accessible
              container, so inner buttons would be flattened away from
              TalkBack/Maestro). */}
          <HStack className="items-center justify-between">
            <Icon as={EditIcon} size="md" className="text-typography-400" />
            {task.hasCheckNeeded ? (
              <Icon as={InfoIcon} size="xl" className="text-warning-600" />
            ) : null}
          </HStack>
          {/* Capped at 3 lines: the deck frame is fixed-height, so an epic
              title must truncate rather than push the chips out of the card. */}
          <Text
            numberOfLines={3}
            className="font-heading text-[30px] leading-[38px] text-typography-900"
          >
            {task.title}
          </Text>
          <HStack className="flex-wrap items-center gap-2">
            {/* Star-value chip (FR11): a reward preview, not a priority label —
                urgency shows as value, never as red/overdue framing. Gold is
                reserved for stars (design brief). */}
            <HStack className="items-center gap-1 rounded-full bg-tertiary-50 px-2.5 py-1">
              <Icon as={StarIcon} size="sm" className="fill-tertiary-500 text-tertiary-500" />
              <Text className="font-body-bold text-sm text-tertiary-700">{starValue}</Text>
            </HStack>
            {/* In-progress state marker (UX: card shows "Continue" on return). */}
            {inProgress ? (
              <Badge action="success" variant="solid">
                <BadgeText>Continue</BadgeText>
              </Badge>
            ) : null}
            {/* Health indicator (Story 7.2, AC6): kind honey/terracotta tints,
                never red/alarming — a heads-up so the card-back prompt isn't a
                surprise. */}
            {healthFlag ? (
              <Badge action={healthFlag === 'avoided' ? 'error' : 'warning'} variant="solid">
                <BadgeText>{HEALTH_LABELS[healthFlag]}</BadgeText>
              </Badge>
            ) : null}
            {/* Size chip: honey for Big time, muted teal for Quick win. */}
            {task.size ? (
              <Badge action={task.size === 'big_time' ? 'warning' : 'info'} variant="solid">
                <BadgeText>{SIZE_LABELS[task.size]}</BadgeText>
              </Badge>
            ) : null}
            {contexts.map((context) => (
              <Badge key={context} action="muted" variant="solid">
                <BadgeText>
                  {(CONTEXT_LABELS as Record<string, string>)[context] ?? context}
                </BadgeText>
              </Badge>
            ))}
          </HStack>
        </VStack>
        {/* Bottom hints: deadline + first line of notes, so cards with detail
            don't feel empty (design brief). Muted — informational, not urgent. */}
        {deadlineHint || notesHint ? (
          <VStack className="gap-2 border-t border-outline-100 pt-4">
            {deadlineHint ? (
              <HStack className="items-center gap-2">
                <Icon as={CalendarDaysIcon} size="sm" className="text-typography-400" />
                <Text className="font-body-medium text-sm text-typography-500">
                  Due {deadlineHint}
                </Text>
              </HStack>
            ) : null}
            {notesHint ? (
              <HStack className="items-center gap-2">
                <Icon as={EditIcon} size="sm" className="text-typography-400" />
                <Text numberOfLines={1} className="flex-1 font-body text-sm text-typography-500">
                  {notesHint}
                </Text>
              </HStack>
            ) : null}
          </VStack>
        ) : null}
      </VStack>
    </Box>
  );
}
