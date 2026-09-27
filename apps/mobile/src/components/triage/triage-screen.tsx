import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { TriageList } from '@/components/triage/triage-list';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { AttentionRow } from '@/services/welcome-back';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * The whole welcome-back triage screen as the user sees it — back header
 * and the attention list (or "All caught up") — driven entirely by props.
 * src/app/triage.tsx supplies the rows and the Keep / Cut loose / Later
 * behaviour; the screen stories (and so the design canvas) supply fixtures.
 */
export function TriageScreen({
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
  /** Both the back button and the "All caught up" deck CTA. */
  onGoToDeck: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={onGoToDeck}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        <Text className="font-heading text-2xl text-typography-900">What's up</Text>
      </HStack>
      <TriageList
        rows={rows}
        onKeep={onKeep}
        onCutLoose={onCutLoose}
        onLater={onLater}
        onGoToDeck={onGoToDeck}
      />
    </SafeAreaView>
  );
}
