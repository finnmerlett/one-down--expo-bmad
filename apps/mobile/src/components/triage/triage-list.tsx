import { FlatList } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { HEALTH_LABELS } from '@/components/card-stack/task-card';
import { EmptyState } from '@/components/empty-state/empty-state';
import type { AttentionReason, AttentionRow } from '@/services/welcome-back';

// Reason chips reuse the 7.2 health copy so the vocabulary stays consistent
// across the card front, the prompt, and triage.
const REASON_LABELS: Record<AttentionReason, string> = {
  deadline_passed: 'Deadline passed',
  stale: HEALTH_LABELS.stale,
  avoided: HEALTH_LABELS.avoided,
};

// Row-scoped action labels WITHOUT the task title (UX note: the row gives
// TalkBack its context — avoid embedding the title in three more labels).
function TriageRow({
  row,
  onKeep,
  onCutLoose,
  onLater,
}: {
  row: AttentionRow;
  onKeep: () => void;
  onCutLoose: () => void;
  onLater: () => void;
}) {
  return (
    <VStack className="gap-3 rounded-2xl border border-outline-200 bg-background-0 px-4 py-3">
      <HStack className="items-center gap-2">
        <Text numberOfLines={1} className="flex-1 text-base font-medium text-typography-900">
          {row.task.title}
        </Text>
        <Badge action="muted" variant="outline">
          <BadgeText>{REASON_LABELS[row.reason]}</BadgeText>
        </Badge>
      </HStack>
      <HStack className="flex-wrap gap-2">
        <Button size="sm" variant="outline" onPress={onKeep} aria-label="Keep task">
          <ButtonText>Keep</ButtonText>
        </Button>
        <Button size="sm" variant="outline" onPress={onCutLoose} aria-label="Cut task loose">
          <ButtonText>Cut loose</ButtonText>
        </Button>
        <Button size="sm" variant="outline" onPress={onLater} aria-label="Decide later">
          <ButtonText>Later</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}

/**
 * Welcome-back triage (Story 7.3, AC3) — a plain fast-decision list, NOT
 * Epic 6.2's review mode. Presentational: rows + per-row decision callbacks;
 * the route owns which rows remain. Empty list = "All caught up" with a
 * CTA back to the deck (never a dead end).
 */
export function TriageList({
  rows,
  onKeep,
  onCutLoose,
  onLater,
  onGoToDeck,
}: {
  rows: AttentionRow[];
  onKeep: (row: AttentionRow) => void;
  onCutLoose: (row: AttentionRow) => void;
  onLater: (row: AttentionRow) => void;
  onGoToDeck: () => void;
}) {
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.task.id}
      renderItem={({ item }) => (
        <TriageRow
          row={item}
          onKeep={() => onKeep(item)}
          onCutLoose={() => onCutLoose(item)}
          onLater={() => onLater(item)}
        />
      )}
      ListEmptyComponent={
        <Box className="py-8">
          <EmptyState
            title="All caught up"
            body="Nothing needs your attention right now."
            actionLabel="Go to your deck"
            onAction={onGoToDeck}
          />
        </Box>
      }
      className="flex-1"
      contentContainerClassName="gap-2 px-4 pb-8"
    />
  );
}
