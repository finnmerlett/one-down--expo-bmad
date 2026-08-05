import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { ParsedTaskDraft } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import { AddIcon, CheckIcon, CloseIcon, Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * The brain-dump check screen (v1.5 07f — the gate): NOTHING is saved until
 * `Add N tasks`. One box per parsed task — pine check, title (tap to reword
 * in place), × drops it — with its evidence quotes indented under a faint
 * left rule. Unclaimed dump lines are primary-dashed rows with a + that
 * promotes them via AI. The list opens scrolled to the BOTTOM (unclaimed
 * lines are the loudest thing) with a soft-fade clip at the top.
 *
 * `Change these` (07g/h) opens the dashed WHAT SHOULD BE DIFFERENT box —
 * submitting re-parses the WHOLE dump with the feedback.
 */
export function BrainDumpCheck({
  tasks,
  unclaimed,
  working = false,
  promotingLine = null,
  onRename,
  onDrop,
  onPromote,
  onChangeThese,
  onAddAll,
  onBackToDump,
}: {
  tasks: ParsedTaskDraft[];
  unclaimed: string[];
  /** A re-parse is in flight — boxes fade, the Change button spins. */
  working?: boolean;
  /** The unclaimed line currently being promoted (its + spins). */
  promotingLine?: string | null;
  onRename: (index: number, title: string) => void;
  onDrop: (index: number) => void;
  onPromote: (line: string) => void;
  onChangeThese: (feedback: string) => void;
  onAddAll: () => void;
  onBackToDump: () => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  // One-shot entry scroll to the bottom (07f) — unclaimed rows live there.
  const didEntryScrollRef = useRef(false);

  const commitRename = (index: number) => {
    if (editingIndex !== index) return;
    setEditingIndex(null);
    const trimmed = draft.trim();
    const current = tasks[index];
    if (current && trimmed && trimmed !== current.title) onRename(index, trimmed);
  };

  const submitChange = () => {
    const trimmed = changeText.trim();
    if (!trimmed || working) return;
    setChangeOpen(false);
    setChangeText('');
    onChangeThese(trimmed);
  };

  return (
    <VStack className="flex-1 gap-3 px-6 pb-4">
      <Box className="min-h-0 flex-1">
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (didEntryScrollRef.current) return;
            didEntryScrollRef.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }}
        >
          <VStack
            className={`gap-2.5 pt-3 ${working ? 'opacity-[0.45]' : ''}`}
            pointerEvents={working ? 'none' : 'auto'}
          >
            {tasks.map((task, index) => (
              <VStack
                key={`${task.title}:${index}`}
                className="gap-2 rounded-[15px] border border-outline-100 bg-background-0 px-4 py-3"
              >
                <HStack className="items-center gap-2.5">
                  <Icon as={CheckIcon} size="sm" className="flex-none text-success-600" />
                  {editingIndex === index ? (
                    <TextInput
                      aria-label={`Reword task: ${task.title}`}
                      autoFocus
                      value={draft}
                      onChangeText={setDraft}
                      onSubmitEditing={() => commitRename(index)}
                      onBlur={() => commitRename(index)}
                      returnKeyType="done"
                      className="flex-1 font-body-semibold text-[14.5px] text-typography-900"
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      aria-label={`Reword task: ${task.title}`}
                      onPress={() => {
                        setEditingIndex(index);
                        setDraft(task.title);
                      }}
                      className="min-h-6 flex-1 justify-center"
                    >
                      <Text className="font-body-semibold text-[14.5px] text-typography-900">
                        {task.title}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    aria-label={`Drop task: ${task.title}`}
                    hitSlop={6}
                    onPress={() => onDrop(index)}
                    className="h-7 w-7 flex-none items-center justify-center rounded-full"
                  >
                    <Icon as={CloseIcon} size="sm" className="text-typography-300" />
                  </Pressable>
                </HStack>
                {task.evidence.length > 0 ? (
                  <VStack className="ml-[3px] gap-1 border-l-2 border-outline-100 pl-3">
                    {task.evidence.map((quote) => (
                      <Text key={quote} className="font-body text-[13px] text-typography-400">
                        {quote}
                      </Text>
                    ))}
                  </VStack>
                ) : null}
              </VStack>
            ))}
            {unclaimed.map((line) => (
              <HStack
                key={line}
                className="items-center gap-2.5 rounded-[15px] border-[1.5px] border-dashed border-primary-300 bg-primary-50/60 px-4 py-3"
              >
                <VStack className="min-w-0 flex-1 border-l-2 border-primary-200 pl-3">
                  <Text className="font-body text-[13px] text-typography-500">{line}</Text>
                </VStack>
                <Pressable
                  accessibilityRole="button"
                  aria-label={`Add as task: ${line}`}
                  hitSlop={6}
                  disabled={promotingLine !== null}
                  onPress={() => onPromote(line)}
                  className="h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-500 active:bg-primary-600"
                >
                  {promotingLine === line ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon as={AddIcon} size="sm" className="text-typography-0" />
                  )}
                </Pressable>
              </HStack>
            ))}
          </VStack>
        </ScrollView>
        {/* Soft-fade clip at the top — the list slides under the header. */}
        <Box pointerEvents="none" className="absolute left-0 right-0 top-0" style={{ height: 14 }}>
          <Svg width="100%" height={14}>
            <Defs>
              <LinearGradient id="check-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F4F6F5" stopOpacity={1} />
                <Stop offset="1" stopColor="#F4F6F5" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={14} fill="url(#check-fade)" />
          </Svg>
        </Box>
      </Box>
      {changeOpen ? (
        <VStack className="gap-2 rounded-[15px] border-[1.5px] border-dashed border-primary-300 bg-background-0 px-[15px] py-3">
          <Text className="font-mono text-[11px] uppercase tracking-caps text-primary-600">
            What should be different
          </Text>
          <TextInput
            aria-label="What should be different"
            autoFocus
            value={changeText}
            onChangeText={setChangeText}
            onSubmitEditing={submitChange}
            returnKeyType="go"
            placeholder="Describe a split, a merge, or something we missed"
            className="font-body text-sm text-typography-900"
          />
          <Pressable
            accessibilityRole="button"
            aria-label="Send change"
            onPress={submitChange}
            className="h-9 flex-row items-center justify-center gap-1.5 self-start rounded-full bg-primary-500 px-4 active:bg-primary-600"
          >
            <Icon as={CheckIcon} size="xs" className="text-typography-0" />
            <Text className="font-body-bold text-[13px] text-typography-0">Change</Text>
          </Pressable>
        </VStack>
      ) : null}
      <HStack className="items-center justify-between">
        <Pressable
          accessibilityRole="button"
          aria-label="Change these"
          disabled={working}
          onPress={() => setChangeOpen((open) => !open)}
          className="h-9 flex-row items-center gap-1.5 rounded-full px-1 active:opacity-60"
        >
          {working ? <ActivityIndicator size="small" color="#43A7A1" /> : null}
          <Text className="font-body-semibold text-sm text-typography-600">Change these</Text>
        </Pressable>
        {unclaimed.length > 0 ? (
          <Text className="font-mono text-[11px] uppercase tracking-caps text-typography-400">
            {`${unclaimed.length} ${unclaimed.length === 1 ? 'entry' : 'entries'} not added`}
          </Text>
        ) : null}
      </HStack>
      <Pressable
        accessibilityRole="button"
        aria-label={`Add ${tasks.length} tasks`}
        disabled={tasks.length === 0 || working}
        onPress={onAddAll}
        className="h-[54px] flex-row items-center justify-center gap-[9px] rounded-full bg-primary-500 shadow-fab active:bg-primary-600 disabled:opacity-50"
      >
        <Icon as={CheckIcon} size="md" className="text-typography-0" />
        <Text className="font-body-bold text-base text-typography-0">
          {`Add ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        aria-label="Back to the dump"
        onPress={onBackToDump}
        className="h-10 items-center justify-center rounded-full active:bg-background-200"
      >
        <Text className="font-body-bold text-sm text-typography-500">Back to the dump</Text>
      </Pressable>
    </VStack>
  );
}
