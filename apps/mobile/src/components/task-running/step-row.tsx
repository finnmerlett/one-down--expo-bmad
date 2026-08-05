import type { SubtaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { CheckIcon, Icon, StarIcon, TrashIcon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/** v1.5 step grading (spec §5): done sinks into the paper, NOW is the one
 *  raised row with a primary ring, later sits flat and dimmed. */
export type StepGrade = 'done' | 'now' | 'later';

/**
 * One graded step row (design 05/E8). Done rows carry their banked hollow
 * star(s) — 1 on a quick win, 2 on a big time — so progress is legible from
 * the rows themselves. A11y keeps the checkbox contract (`Subtask: <title>`
 * + checked) so Maestro selectors and TalkBack behavior survive the restyle.
 */
export function StepRow({
  subtask,
  grade,
  bankedStars = 0,
  onToggle,
  onDelete,
}: {
  subtask: SubtaskData;
  grade: StepGrade;
  /** Hollow stars this DONE row banked (0 renders none). */
  bankedStars?: number;
  onToggle?: (subtask: SubtaskData) => void;
  onDelete?: (subtask: SubtaskData) => void;
}) {
  const rowClass =
    grade === 'done'
      ? 'bg-[rgba(44,39,35,0.045)] py-2.5'
      : grade === 'now'
        ? 'border-[1.5px] border-primary-300 bg-background-0 py-[11px] shadow-step-now'
        : 'border border-outline-100 bg-background-0 py-2.5';

  return (
    <HStack className={`items-center gap-[13px] rounded-[15px] px-[15px] ${rowClass}`}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: subtask.completed }}
        aria-label={`Subtask: ${subtask.title}`}
        onPress={() => onToggle?.(subtask)}
        className="min-h-6 flex-1 flex-row items-center gap-[13px]"
      >
        {grade === 'done' ? (
          <Box className="h-[23px] w-[23px] flex-none items-center justify-center rounded-full bg-success-500">
            <Icon as={CheckIcon} size="xs" className="text-typography-0" />
          </Box>
        ) : (
          <Box
            className={`h-[19px] w-[19px] flex-none rounded-full border-2 ${
              grade === 'now' ? 'border-primary-500' : 'border-typography-300'
            }`}
          />
        )}
        <Text
          className={
            grade === 'done'
              ? 'flex-1 font-body text-sm leading-5 text-typography-400 line-through'
              : grade === 'now'
                ? 'flex-1 font-body-semibold text-[14.5px] leading-5 text-typography-900'
                : 'flex-1 font-body-medium text-sm leading-5 text-typography-600'
          }
        >
          {subtask.title}
        </Text>
        {grade === 'done' && bankedStars > 0 ? (
          <HStack className="flex-none gap-[3px]">
            {Array.from({ length: bankedStars }, (_, index) => (
              <Icon key={index} as={StarIcon} size="2xs" className="text-[#C4A85E]" />
            ))}
          </HStack>
        ) : null}
      </Pressable>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          aria-label={`Delete subtask: ${subtask.title}`}
          hitSlop={8}
          onPress={() => onDelete(subtask)}
          className="h-8 w-8 flex-none items-center justify-center rounded-full"
        >
          <Icon as={TrashIcon} size="sm" className="text-typography-200" />
        </Pressable>
      ) : null}
    </HStack>
  );
}
