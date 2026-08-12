import { MAX_AI_GENERAL_NOTES_CHARS } from '@one-down/shared';

import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';

/**
 * General AI notes (9-5 item 4): the editable bullet list of durable facts
 * the AI knows about the user — grown automatically by refine learnings and
 * triage size corrections, fully theirs to rewrite. Presentational; the
 * settings route owns load + persist (same pattern as the other sections).
 */
export function AiNotesSection({
  notes,
  onChange,
  onBlur,
}: {
  notes: string;
  onChange: (next: string) => void;
  /** Persist point — the route saves on blur, not per keystroke. */
  onBlur: () => void;
}) {
  return (
    <VStack className="gap-3 rounded-3xl border border-outline-100 bg-background-0 p-5">
      <VStack className="gap-1">
        <Text className="font-body-bold text-base text-typography-900">AI notes about you</Text>
        <Text className="font-body text-sm text-typography-500">
          What the AI has learned about how you like your tasks. It reads these with every
          suggestion — bullet points, yours to edit.
        </Text>
      </VStack>
      <Textarea size="md" className="min-h-28 rounded-[15px] border-outline-100 bg-background-0">
        <TextareaInput
          aria-label="AI general notes"
          placeholder="- Nothing here yet — add your own pointers, one per line"
          value={notes}
          onChangeText={onChange}
          onBlur={onBlur}
          maxLength={MAX_AI_GENERAL_NOTES_CHARS}
          multiline
        />
      </Textarea>
    </VStack>
  );
}
