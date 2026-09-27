import { SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';

import { BrainDumpCheck } from '@/components/brain-dump/brain-dump-check';
import { BrainDumpInput, type BrainDumpState } from '@/components/brain-dump/brain-dump-input';
import { HStack } from '@/components/ui/hstack';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { BrainDumpCheckState } from '@/services/brain-dump-draft';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

/**
 * Brain dump screen (Story 6.1 → v1.5 D6 gate): the dump parses into a CHECK
 * stage — one box per task with its evidence quotes, unclaimed lines as
 * promotable dashed rows — and NOTHING saves until `Add N tasks`. All AI
 * calls go through the server's tRPC seam, never directly to Gemini.
 *
 * Leaving the screen (9.8 C1) — back arrow or hardware back — always exits
 * HOME and persists the live stage as a draft (dump text, or the whole parsed
 * check): reopening restores it. Returning from the check to the dump is the
 * `Back to the dump` button's job, and only `Add N tasks` clears the draft.
 *
 * Driven entirely by props: src/app/brain-dump.tsx supplies the parse, draft
 * and timer behaviour; the screen stories (and so the design canvas) supply
 * fixtures. `check === null` is the dump stage, anything else the check.
 */
export function BrainDumpScreen({
  state,
  text,
  onChangeText,
  onSubmit,
  onQuickAddInstead,
  check,
  working,
  autoEditIndex,
  onAutoEditHandled,
  onRename,
  onDrop,
  onPromote,
  onChangeThese,
  onAddAll,
  onBackToDump,
  onClose,
}: {
  state: BrainDumpState;
  text: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  onQuickAddInstead: () => void;
  /** `null` = the dump stage; otherwise the parsed check stage. */
  check: BrainDumpCheckState | null;
  working: boolean;
  autoEditIndex: number | null;
  onAutoEditHandled: () => void;
  onRename: (index: number, title: string) => void;
  onDrop: (index: number) => void;
  onPromote: (line: string) => void;
  onChangeThese: (feedback: string) => void;
  onAddAll: () => void;
  onBackToDump: () => void;
  onClose: () => void;
}) {
  const checking = check !== null;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background-100">
      <HStack className="items-center gap-2 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Close brain dump"
          hitSlop={8}
          onPress={onClose}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-background-100"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-typography-900" />
        </Pressable>
        {checking ? (
          <Text className="font-heading text-2xl text-typography-900">
            {`Check these ${check.tasks.length}`}
          </Text>
        ) : null}
      </HStack>
      {checking ? (
        <BrainDumpCheck
          tasks={check.tasks}
          unclaimed={check.unclaimed}
          working={working}
          autoEditIndex={autoEditIndex}
          onAutoEditHandled={onAutoEditHandled}
          onRename={onRename}
          onDrop={onDrop}
          onPromote={onPromote}
          onChangeThese={onChangeThese}
          onAddAll={onAddAll}
          onBackToDump={onBackToDump}
        />
      ) : (
        <BrainDumpInput
          state={state}
          value={text}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          onQuickAddInstead={onQuickAddInstead}
        />
      )}
    </SafeAreaView>
  );
}
