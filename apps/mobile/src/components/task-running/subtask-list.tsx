import { useState } from 'react';

import { sizeKeyOf, STAR_WEIGHTS, type SubtaskData, type TaskSize } from '@one-down/shared';

import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

import { StepRow, type StepGrade } from './step-row';

/**
 * The step list on the working screen (v1.5 spec §5): `STEPS` caps label,
 * rows graded done → now → later (only one row ever looks live — the first
 * uncompleted), done rows carrying their banked hollow stars. A11y rows keep
 * the 6.3 checkbox contract.
 *
 * Story 6.4's Refine affordance survives below the list until D4 replaces it
 * with the Change these / Get more steps action row.
 */
export function SubtaskList({
  subtasks,
  taskSize = null,
  onToggle,
  onDelete,
  onRefine,
  refineDisabled = false,
  initialRefineOpen = false,
}: {
  subtasks: SubtaskData[];
  /** Parent task size — sets how many hollow stars a done row shows. */
  taskSize?: TaskSize | null;
  onToggle?: (subtask: SubtaskData) => void;
  onDelete?: (subtask: SubtaskData) => void;
  /** Submit refine feedback (Story 6.4). Omitted = no Refine button. */
  onRefine?: (feedback: string) => void;
  /** Disable submission while a refine round-trip is in flight. */
  refineDisabled?: boolean;
  /** Story/preview affordance — start with the feedback input expanded. */
  initialRefineOpen?: boolean;
}) {
  const [refineOpen, setRefineOpen] = useState(initialRefineOpen);
  const [feedback, setFeedback] = useState('');

  if (subtasks.length === 0) return null;

  const showRefine = onRefine !== undefined && subtasks.some((subtask) => subtask.source === 'ai');
  const nowId = subtasks.find((subtask) => !subtask.completed)?.id;
  const sizeKey = sizeKeyOf(taskSize);
  // Hollow stars per done row (1 quick win / 2 big time) — rows past the
  // banking cap show none, matching what they actually banked.
  const bankPerStep = STAR_WEIGHTS.stepBank[sizeKey];
  const bankCap = STAR_WEIGHTS.stepBankCap[sizeKey];

  const gradeOf = (subtask: SubtaskData): StepGrade =>
    subtask.completed ? 'done' : subtask.id === nowId ? 'now' : 'later';

  let doneSeen = 0;

  const handleSendFeedback = () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onRefine?.(trimmed);
    setFeedback('');
    setRefineOpen(false);
  };

  return (
    <VStack className="gap-2.5">
      <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-400">
        Steps
      </Text>
      <VStack className="gap-2">
        {subtasks.map((subtask) => {
          const grade = gradeOf(subtask);
          const banked = grade === 'done' ? (++doneSeen <= bankCap ? bankPerStep : 0) : 0;
          return (
            <StepRow
              key={subtask.id}
              subtask={subtask}
              grade={grade}
              bankedStars={banked}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          );
        })}
      </VStack>
      {showRefine && !refineOpen ? (
        <Button
          size="sm"
          variant="link"
          aria-label="Refine"
          onPress={() => setRefineOpen(true)}
          className="self-start"
        >
          <ButtonText>Refine</ButtonText>
        </Button>
      ) : null}
      {showRefine && refineOpen ? (
        <VStack className="gap-2 pt-1">
          <Textarea size="sm" isDisabled={refineDisabled} className="rounded-[15px]">
            <TextareaInput
              aria-label="Breakdown feedback"
              placeholder="Why does this miss the mark?"
              value={feedback}
              onChangeText={setFeedback}
            />
          </Textarea>
          <Button
            size="sm"
            variant="outline"
            aria-label="Send feedback"
            isDisabled={refineDisabled || feedback.trim().length === 0}
            onPress={handleSendFeedback}
            className="self-start"
          >
            <ButtonText>Send feedback</ButtonText>
          </Button>
        </VStack>
      ) : null}
    </VStack>
  );
}
