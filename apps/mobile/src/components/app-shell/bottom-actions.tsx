import { Brain, Layers, Plus } from 'lucide-react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

/**
 * Standing bottom actions (v1.5 frames 01/02): a 1:1 plus circle for a single
 * task and a Brain dump pill taking the width — two separate pills, no FAB.
 * Whenever the check queue is non-empty, a dashed blueprint triage button
 * with a count badge joins on the left (9-5 item 6 — it used to appear only
 * while the Right-now sheet was expanded, which buried the queue).
 */
export function BottomActions({
  onAddPress,
  onBrainDumpPress,
  triageCount = 0,
  onTriagePress,
}: {
  onAddPress: () => void;
  onBrainDumpPress: () => void;
  /** Cards awaiting a guess-check; the badge carries the count. */
  triageCount?: number;
  onTriagePress?: () => void;
}) {
  return (
    <HStack className="gap-2.5 px-[22px] pb-6">
      {triageCount > 0 && onTriagePress ? (
        <Pressable
          accessibilityRole="button"
          aria-label={`Check ${triageCount} guessed ${triageCount === 1 ? 'task' : 'tasks'}`}
          onPress={onTriagePress}
          className="h-[54px] w-[54px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-info-500/40 bg-info-100"
        >
          <Icon as={Layers} size="lg" className="text-info-800" />
          <HStack className="absolute -right-0.5 -top-0.5 h-[19px] min-w-[19px] items-center justify-center rounded-full bg-info-800 px-[5px]">
            <Text className="font-mono text-2xs leading-none text-info-50">{triageCount}</Text>
          </HStack>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        aria-label="Add a task"
        onPress={onAddPress}
        className="h-[54px] w-[54px] flex-none items-center justify-center rounded-full bg-primary-500 shadow-fab active:bg-primary-600"
      >
        <Icon as={Plus} size="xl" className="text-typography-0" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        aria-label="Brain dump"
        onPress={onBrainDumpPress}
        className="h-[54px] flex-1 flex-row items-center justify-center gap-2.5 rounded-full bg-primary-500 shadow-fab active:bg-primary-600"
      >
        <Icon as={Brain} size="md" className="text-typography-0" />
        <Text className="font-body-bold text-base text-typography-0">Brain dump</Text>
      </Pressable>
    </HStack>
  );
}
