import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import type { WelcomeBackSummary as SummaryData } from '@/services/welcome-back';

/**
 * Factual body copy (Story 7.3, AC1 — zero guilt, UX journey "this app isn't
 * mad at me"): zero-count lines are simply omitted, never "you haven't…"
 * phrasing, no streaks, no red. Exported pure for tests (singular/plural,
 * degenerate daysAway of 0 from the deep-link seam).
 */
export function buildSummaryLines(summary: SummaryData): string[] {
  const lines: string[] = [];
  const plural = (count: number, singular: string, pluralWord: string) =>
    count === 1 ? singular : pluralWord;
  if (summary.daysAway > 0) {
    lines.push(`It's been ${summary.daysAway} ${plural(summary.daysAway, 'day', 'days')}.`);
  }
  if (summary.tasksWaiting > 0) {
    lines.push(
      `${summary.tasksWaiting} ${plural(summary.tasksWaiting, 'task is', 'tasks are')} waiting for you.`,
    );
  }
  if (summary.deadlinesPassed > 0) {
    lines.push(
      `${summary.deadlinesPassed} ${plural(summary.deadlinesPassed, 'deadline', 'deadlines')} passed while you were away.`,
    );
  }
  if (summary.staleSuggestions > 0) {
    lines.push(
      `${summary.staleSuggestions} ${plural(summary.staleSuggestions, 'task', 'tasks')} might be worth cutting loose.`,
    );
  }
  if (lines.length === 0) {
    lines.push("Nothing's waiting — you're all caught up.");
  }
  return lines;
}

/**
 * Welcome-back screen body (Story 7.3) — presentational: summary + two CTAs.
 * One primary action per screen (DR): full-width primary into triage,
 * ghost/outline straight to the deck.
 */
export function WelcomeBackSummary({
  summary,
  onTriage,
  onDeck,
}: {
  summary: SummaryData;
  onTriage: () => void;
  onDeck: () => void;
}) {
  return (
    <VStack className="flex-1 justify-center gap-6 px-8">
      <VStack className="gap-3">
        <Text className="text-3xl font-semibold text-typography-900">Welcome back!</Text>
        <VStack className="gap-1">
          {buildSummaryLines(summary).map((line) => (
            <Text key={line} className="text-base text-typography-700">
              {line}
            </Text>
          ))}
        </VStack>
      </VStack>
      <VStack className="gap-3">
        <Button size="lg" onPress={onTriage} aria-label="Let's see what's up">
          <ButtonText>Let&apos;s see what&apos;s up</ButtonText>
        </Button>
        <Button size="lg" variant="outline" onPress={onDeck} aria-label="Go to main deck">
          <ButtonText>Go to main deck</ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
}
