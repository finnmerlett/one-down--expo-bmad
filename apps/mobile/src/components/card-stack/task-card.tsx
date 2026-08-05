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
import type { StarBadge } from '@/services/star-calculator';
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

const DAY_MS = 86_400_000;

/** v1.5 due-line copy: relative when it's close (the rail is the urgency
 *  signal), absolute when it isn't. */
export function deadlineCopy(deadline: Date | null, now: Date): string {
  if (!deadline) return 'No deadline';
  // Calendar-day distance (local) — a deadline tomorrow evening is "Due
  // tomorrow" however many hours away it is.
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(deadline) - startOf(now)) / DAY_MS);
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === 2) return 'Due in 2 days';
  return `Due ${deadline.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })}`;
}

/** The white value pill that sits at the band's right end (frames 04/E2/E3):
 *  the card's real value keeps its slot so nothing has to be added up. */
function ValuePill({ starValue }: { starValue: number }) {
  return (
    <HStack className="h-[30px] flex-none items-baseline gap-[3px] rounded-full border border-outline-100 bg-background-0 px-[11px]">
      <Text className="font-mono text-[17px] leading-[28px] text-typography-900">{starValue}</Text>
      <Text className="text-[11px] text-tertiary-500">★</Text>
    </HStack>
  );
}

/**
 * Card front, v1.5 "Clay & Paper" (frames 02/04/E1–E5): pencil + value on
 * the top line, Gabarito title, state chip, the one-line reason, and a
 * bottom rail carrying what the card REQUIRES. A live badge (bonus window /
 * don't-skip offer) opens a gold band across the top — badge + reason left,
 * the card's real value in a white pill right; inside two days of the
 * deadline the band turns primary-tinted `TOP OF THE DECK` instead (badge
 * gone, placement takes over). Presentational — `starValue` and `badge` are
 * computed in the home layer.
 */
export function TaskCard({
  task,
  starValue,
  badge = null,
  topOfDeck = false,
}: {
  task: TaskData;
  starValue: number;
  /** Live badge (gold band). Wins over topOfDeck when both apply. */
  badge?: StarBadge | null;
  /** Inside the 2-day window — primary TOP OF THE DECK band. */
  topOfDeck?: boolean;
}) {
  const contexts = parseTaskContexts(task.contexts);
  const inProgress = task.status === 'in_progress';
  const now = new Date();
  // Health chip (Story 7.2, AC6): computed at render time — cheap, and the
  // live query re-renders the card whenever the underlying fields change.
  const healthFlag = evaluateTaskHealth(task, now);

  const reason = task.details?.trim() ? task.details.trim().split('\n')[0] : null;
  const band: 'badge' | 'top' | null = badge ? 'badge' : topOfDeck ? 'top' : null;
  const dueLine = deadlineCopy(task.deadline, now);

  const cardBorder =
    band === 'badge'
      ? 'border-tertiary-400'
      : band === 'top'
        ? 'border-primary-300'
        : 'border-outline-100';

  return (
    <Box
      className={`h-full w-full overflow-hidden rounded-[22px] border bg-background-0 shadow-soft-card ${cardBorder}`}
    >
      <VStack className="h-full">
        {band === 'badge' && badge ? (
          <HStack className="h-[52px] items-center justify-between gap-3 border-b border-tertiary-300 bg-tertiary-100 px-5">
            <HStack className="min-w-0 flex-none items-center gap-[9px]">
              <HStack className="h-6 items-center rounded-full bg-tertiary-200 px-[7px]">
                <Text className="font-mono text-[14px] text-tertiary-700">{`+${badge.amount}`}</Text>
              </HStack>
              <Text
                numberOfLines={1}
                className="min-w-0 font-mono text-[11px] tracking-caps text-tertiary-700"
              >
                {badge.reason}
              </Text>
            </HStack>
            <ValuePill starValue={starValue} />
          </HStack>
        ) : null}
        {band === 'top' ? (
          <HStack className="h-[52px] items-center justify-between gap-3 border-b border-primary-200 bg-primary-50 px-5">
            <Text className="font-mono text-[11px] tracking-caps text-primary-600">
              TOP OF THE DECK
            </Text>
            <ValuePill starValue={starValue} />
          </HStack>
        ) : null}
        <VStack className={`flex-1 gap-4 px-6 ${band ? 'pt-[22px]' : 'pt-6'}`}>
          {/* Corner markers: edit pencil top-left (tap-to-edit) and the review
              marker top-right — VISUAL only; the interactive tap targets live
              in the stack layer, above the swipe gesture (the top card is an
              accessible container, so inner buttons would be flattened away
              from TalkBack/Maestro). Review ink is blueprint blue now: blue =
              "we guessed, you haven't agreed" (spec §2). With a band, the
              value lives in the band's white pill instead of this row. */}
          <HStack className="items-start justify-between">
            <Icon as={EditIcon} size="sm" className="text-typography-200" />
            <HStack className="items-baseline gap-1">
              {task.hasCheckNeeded ? (
                <Icon as={InfoIcon} size="lg" className="mr-1 self-center text-info-500" />
              ) : null}
              {band === null ? (
                <>
                  <Text className="font-mono text-[21px] leading-none text-tertiary-500">
                    {starValue}
                  </Text>
                  <Text className="text-[11px] text-tertiary-500">★</Text>
                </>
              ) : null}
            </HStack>
          </HStack>
          {/* Capped at 3 lines: the deck frame is fixed-height, so an epic
              title must truncate rather than push the rail out of the card. */}
          <Text
            numberOfLines={3}
            className="font-heading text-[30px] leading-[36px] tracking-tight text-typography-900"
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
            rendered so every card shares one silhouette. Gold-tinted under a
            badge; the due line carries the band's ink. */}
        <HStack
          className={`items-end justify-between border-t border-outline-100 px-6 pb-[18px] pt-[15px] ${
            band === 'badge' ? 'bg-[#FDF6E7]' : 'bg-[#FAFCFB]'
          }`}
        >
          <VStack className="min-w-0 flex-1 gap-[5px]">
            {task.size ? (
              <Text className="font-mono text-[11px] tracking-caps-tight text-typography-500">
                {SIZE_CAPS[task.size]}
              </Text>
            ) : null}
            <Text
              className={`text-[12.5px] ${
                band === 'badge'
                  ? 'font-body-bold text-tertiary-700'
                  : band === 'top'
                    ? 'font-body-bold text-primary-600'
                    : 'font-body-semibold text-typography-600'
              }`}
            >
              {dueLine}
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
