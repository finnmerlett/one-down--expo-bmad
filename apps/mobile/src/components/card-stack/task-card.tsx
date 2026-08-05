import {
  parseTaskContexts,
  type TaskContext,
  type TaskData,
  type TaskSize,
} from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { EditIcon, Icon, InfoIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { CONTEXT_ICONS } from '@/components/stack-filters/context-icons';
import { evaluateTaskHealth, type TaskHealthFlag } from '@/services/task-health';

export const SIZE_LABELS: Record<TaskSize, string> = {
  quick_win: 'Quick win',
  big_time: 'Big time',
};

// Bottom-rail caps variants (v1.5 — DM Mono caps, letterspaced).
const SIZE_CAPS: Record<TaskSize, string> = {
  quick_win: 'QUICK WIN',
  big_time: 'BIG TIME',
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

/**
 * Card front, v1.5 "Clay & Paper" (frame 02): pencil + value on the top line,
 * Gabarito title, state chip, the one-line reason filling the middle, and a
 * bottom rail carrying what the card REQUIRES — size caps + due line left,
 * context glyphs right. Fills whatever frame the stack gives it; `starValue`
 * is computed in the home layer so the card stays presentational.
 */
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
  const reason = task.details?.trim() ? task.details.trim().split('\n')[0] : null;

  return (
    <Box className="h-full w-full overflow-hidden rounded-[22px] border border-outline-100 bg-background-0 shadow-soft-card">
      <VStack className="h-full">
        <VStack className="flex-1 gap-4 px-6 pt-6">
          {/* Corner markers: edit pencil top-left (tap-to-edit) and the review
              marker top-right — VISUAL only; the interactive tap targets live
              in the stack layer, above the swipe gesture (the top card is an
              accessible container, so inner buttons would be flattened away
              from TalkBack/Maestro). Review ink is blueprint blue now: blue =
              "we guessed, you haven't agreed" (spec §2). */}
          <HStack className="items-start justify-between">
            <Icon as={EditIcon} size="sm" className="text-typography-200" />
            <HStack className="items-baseline gap-1">
              {task.hasCheckNeeded ? (
                <Icon as={InfoIcon} size="lg" className="mr-1 self-center text-info-500" />
              ) : null}
              <Text className="font-mono text-[21px] leading-none text-tertiary-500">
                {starValue}
              </Text>
              <Text className="text-[11px] text-tertiary-500">★</Text>
            </HStack>
          </HStack>
          {/* Capped at 3 lines: the deck frame is fixed-height, so an epic
              title must truncate rather than push the rail out of the card. */}
          <Text
            numberOfLines={3}
            className="font-heading text-[31px] leading-[36px] tracking-tight text-typography-900"
          >
            {task.title}
          </Text>
          {inProgress || healthFlag ? (
            <HStack className="flex-wrap items-center gap-2">
              {/* State chip (v1.5): pine dot + label, quiet. */}
              {inProgress ? (
                <HStack className="h-[27px] items-center gap-[7px] self-start rounded-[9px] bg-success-100 px-[11px]">
                  <Box className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  <Text className="font-body-semibold text-[11.5px] text-success-700">
                    In progress
                  </Text>
                </HStack>
              ) : null}
              {/* Health indicator (Story 7.2, AC6) — kept from the previous
                  design as a quiet muted chip (ambiguity #20), never red. */}
              {healthFlag ? (
                <HStack className="h-[27px] items-center self-start rounded-[9px] bg-background-200 px-[11px]">
                  <Text className="font-body-semibold text-[11.5px] text-typography-600">
                    {HEALTH_LABELS[healthFlag]}
                  </Text>
                </HStack>
              ) : null}
            </HStack>
          ) : null}
          {/* The one-line reason (spec §4): details' first line fills what
              used to be dead space — why this is worth doing, kept short. */}
          {reason ? (
            <Text
              numberOfLines={3}
              className="font-body text-[13.5px] leading-5 text-typography-500"
            >
              {reason}
            </Text>
          ) : null}
        </VStack>
        {/* Bottom rail: requirements live below the hairline on a faintly
            tinted panel — size + due left, context glyphs right. Always
            rendered so every card shares one silhouette. */}
        <HStack className="items-end justify-between border-t border-outline-100 bg-[#FAFCFB] px-6 pb-[18px] pt-[15px]">
          <VStack className="min-w-0 flex-1 gap-[5px]">
            {task.size ? (
              <Text className="font-mono text-[11px] tracking-caps-tight text-typography-500">
                {SIZE_CAPS[task.size]}
              </Text>
            ) : null}
            <Text className="font-body-semibold text-[12.5px] text-typography-600">
              {deadlineHint ? `Due ${deadlineHint}` : 'No deadline'}
            </Text>
          </VStack>
          <HStack className="flex-none gap-[9px]">
            {contexts.map((context) => {
              const IconCmp = CONTEXT_ICONS[context as TaskContext];
              return IconCmp ? (
                <Icon key={context} as={IconCmp} size="sm" className="text-typography-400" />
              ) : null;
            })}
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}
