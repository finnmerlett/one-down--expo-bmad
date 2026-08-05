import { useEffect, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { SubtaskData } from '@one-down/shared';

import { Box } from '@/components/ui/box';
import {
  AddIcon,
  CheckIcon,
  EditIcon,
  GripVerticalIcon,
  Icon,
  TrashIcon,
} from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/** Edit-mode rows are FIXED height (titles clamp to one line): the drag maths
 *  divides translation by a constant stride, which variable-height rows would
 *  break. Reading stays the normal list's job. */
const ROW_H = 46;
const ROW_GAP = 8;
const STRIDE = ROW_H + ROW_GAP;

export interface StepEditCallbacks {
  rename: (subtask: SubtaskData, title: string) => void;
  remove: (subtask: SubtaskData) => void;
  add: (title: string) => void;
  reorder: (orderedIds: string[], from: number, to: number) => void;
}

/**
 * Steps edit mode (v1.5 05a/05b): label line `✏ EDITING N STEPS` + `Done`
 * chip; rows keep their size and radius but gain a grip (drag to reorder,
 * lifting with a shadow and −1.4° tilt over a dashed slot) and a bin; tapping
 * the words puts a caret in place — return (or the trailing check) commits,
 * edits apply immediately. `Add a step` is a dashed row at the end.
 *
 * Order is mirrored into local state so a drop lands instantly; the live
 * query catches up a beat later with the same order.
 */
export function StepsEditor({
  subtasks,
  edits,
  onDone,
  onDraggingChange,
}: {
  subtasks: SubtaskData[];
  edits: StepEditCallbacks;
  onDone: () => void;
  /** Fires true while a row is held — the host scroll view should freeze. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const [order, setOrder] = useState(() => subtasks.map((subtask) => subtask.id));
  useEffect(() => {
    setOrder(subtasks.map((subtask) => subtask.id));
  }, [subtasks]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');

  const dragFrom = useSharedValue(-1);
  const dragTo = useSharedValue(-1);
  const dragY = useSharedValue(0);

  const byId = new Map(subtasks.map((subtask) => [subtask.id, subtask]));
  const rows = order.map((id) => byId.get(id)).filter((row): row is SubtaskData => !!row);
  const count = rows.length;

  const setDragging = (dragging: boolean) => onDraggingChange?.(dragging);

  const handleDrop = (from: number, to: number) => {
    dragFrom.value = -1;
    dragTo.value = -1;
    dragY.value = 0;
    if (from === to || from < 0 || to < 0) return;
    const next = [...order];
    const moved = next.splice(from, 1)[0];
    if (moved === undefined) return;
    next.splice(to, 0, moved);
    setOrder(next);
    edits.reorder(next, from, to);
  };

  // Cancel path (gesture interrupted without a drop) — idempotent reset.
  const handleDragFinalize = () => {
    dragFrom.value = -1;
    dragTo.value = -1;
    dragY.value = 0;
  };

  const commitRename = (subtask: SubtaskData) => {
    if (editingId !== subtask.id) return;
    setEditingId(null);
    // Unmounting a focused TextInput makes Android hand focus to the next
    // one (the notes field, seen on-device) — drop the keyboard instead.
    Keyboard.dismiss();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== subtask.title) edits.rename(subtask, trimmed);
  };

  const commitAdd = () => {
    if (!adding) return;
    setAdding(false);
    Keyboard.dismiss();
    const trimmed = addDraft.trim();
    setAddDraft('');
    if (trimmed) edits.add(trimmed);
  };

  return (
    <VStack className="gap-2.5">
      <HStack className="min-h-6 items-center gap-2">
        <Icon as={EditIcon} size="2xs" className="text-primary-600" />
        <Text className="font-mono text-[11px] uppercase tracking-caps text-primary-600">
          {`Editing ${count} step${count === 1 ? '' : 's'}`}
        </Text>
        <Box className="flex-1" />
        <Pressable
          accessibilityRole="button"
          aria-label="Done editing"
          hitSlop={6}
          onPress={onDone}
          className="rounded-full bg-primary-50 px-[13px] py-[4px] active:bg-primary-100"
        >
          <Text className="font-body-semibold text-[12px] text-primary-700">Done</Text>
        </Pressable>
      </HStack>
      <Box className="relative">
        {/* The dashed slot the lifted row hovers over — tracks the target. */}
        <DropSlot dragFrom={dragFrom} dragTo={dragTo} />
        <VStack style={{ gap: ROW_GAP }}>
          {rows.map((subtask, index) => (
            <EditorRow
              key={subtask.id}
              subtask={subtask}
              index={index}
              count={count}
              dragFrom={dragFrom}
              dragTo={dragTo}
              dragY={dragY}
              editing={editingId === subtask.id}
              draft={draft}
              onDraftChange={setDraft}
              onStartRename={() => {
                setAdding(false);
                setEditingId(subtask.id);
                setDraft(subtask.title);
              }}
              onCommitRename={() => commitRename(subtask)}
              onDelete={() => edits.remove(subtask)}
              onDrop={handleDrop}
              onDragFinalize={handleDragFinalize}
              onDraggingChange={setDragging}
            />
          ))}
        </VStack>
      </Box>
      {adding ? (
        <HStack className="h-[46px] items-center gap-2.5 rounded-[15px] border-[1.5px] border-primary-500 bg-background-0 px-3">
          <Icon as={AddIcon} size="sm" className="flex-none text-typography-300" />
          <TextInput
            aria-label="New step title"
            autoFocus
            value={addDraft}
            onChangeText={setAddDraft}
            onSubmitEditing={commitAdd}
            onBlur={commitAdd}
            returnKeyType="done"
            placeholder="Add a step"
            className="flex-1 font-body-medium text-sm text-typography-900"
          />
          <Pressable
            accessibilityRole="button"
            aria-label="Save new step"
            hitSlop={6}
            onPress={commitAdd}
            className="h-8 w-8 flex-none items-center justify-center rounded-full"
          >
            <Icon as={CheckIcon} size="sm" className="text-primary-600" />
          </Pressable>
        </HStack>
      ) : (
        <Pressable
          accessibilityRole="button"
          aria-label="Add a step"
          onPress={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="h-[46px] flex-row items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-dashed border-outline-200 active:bg-background-100"
        >
          <Icon as={AddIcon} size="sm" className="text-typography-400" />
          <Text className="font-body-medium text-sm text-typography-500">Add a step</Text>
        </Pressable>
      )}
      <Text className="self-center font-body text-xs text-typography-400">
        Drag to reorder · tap the words to rewrite
      </Text>
    </VStack>
  );
}

function DropSlot({
  dragFrom,
  dragTo,
}: {
  dragFrom: SharedValue<number>;
  dragTo: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: dragFrom.value >= 0 ? 1 : 0,
    transform: [{ translateY: withTiming(dragTo.value * STRIDE, { duration: 120 }) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      // Plain style objects: reanimated's Animated.View is not css-interop
      // registered, so className here would be silently dropped.
      style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: ROW_H }, style]}
    >
      <Box className="h-full w-full rounded-[15px] border-[1.5px] border-dashed border-primary-300 bg-primary-50/60" />
    </Animated.View>
  );
}

function EditorRow({
  subtask,
  index,
  count,
  dragFrom,
  dragTo,
  dragY,
  editing,
  draft,
  onDraftChange,
  onStartRename,
  onCommitRename,
  onDelete,
  onDrop,
  onDragFinalize,
  onDraggingChange,
}: {
  subtask: SubtaskData;
  index: number;
  count: number;
  dragFrom: SharedValue<number>;
  dragTo: SharedValue<number>;
  dragY: SharedValue<number>;
  editing: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onDelete: () => void;
  onDrop: (from: number, to: number) => void;
  onDragFinalize: () => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const pan = Gesture.Pan()
    .enabled(!editing)
    .onStart(() => {
      dragFrom.value = index;
      dragTo.value = index;
      dragY.value = 0;
      scheduleOnRN(onDraggingChange, true);
    })
    .onUpdate((event) => {
      dragY.value = event.translationY;
      const raw = index + Math.round(event.translationY / STRIDE);
      const target = Math.max(0, Math.min(count - 1, raw));
      if (dragTo.value !== target) dragTo.value = target;
    })
    .onEnd(() => {
      scheduleOnRN(onDrop, index, dragTo.value);
    })
    .onFinalize(() => {
      scheduleOnRN(onDraggingChange, false);
      scheduleOnRN(onDragFinalize);
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (dragFrom.value === index) {
      // The lifted row (05b): shadow, slight offset, −1.4° tilt.
      return {
        zIndex: 10,
        shadowColor: '#2C2723',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        transform: [{ translateY: dragY.value }, { translateX: 4 }, { rotate: '-1.4deg' }],
      };
    }
    let shift = 0;
    if (dragFrom.value >= 0) {
      if (dragFrom.value < index && dragTo.value >= index) shift = -STRIDE;
      else if (dragFrom.value > index && dragTo.value <= index) shift = STRIDE;
    }
    return {
      zIndex: 0,
      shadowOpacity: 0,
      elevation: 0,
      transform: [
        { translateY: withTiming(shift, { duration: 120 }) },
        { translateX: 0 },
        { rotate: '0deg' },
      ],
    };
  });

  if (editing) {
    return (
      <Animated.View style={[{ height: ROW_H }, animatedStyle]}>
        <HStack className="h-full items-center gap-2.5 rounded-[15px] border-[1.5px] border-primary-500 bg-background-0 px-3">
          <Box className="h-full w-7 flex-none items-center justify-center">
            <Icon as={GripVerticalIcon} size="sm" className="text-typography-200" />
          </Box>
          <TextInput
            aria-label={`Rewrite step: ${subtask.title}`}
            autoFocus
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={onCommitRename}
            onBlur={onCommitRename}
            returnKeyType="done"
            className="flex-1 font-body-medium text-sm text-typography-900"
          />
          <Pressable
            accessibilityRole="button"
            aria-label="Save step"
            hitSlop={6}
            onPress={onCommitRename}
            className="h-8 w-8 flex-none items-center justify-center rounded-full"
          >
            <Icon as={CheckIcon} size="sm" className="text-primary-600" />
          </Pressable>
        </HStack>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ height: ROW_H }, animatedStyle]}>
      <HStack
        className={`h-full items-center gap-2.5 rounded-[15px] px-3 ${
          subtask.completed
            ? 'bg-[rgba(44,39,35,0.045)]'
            : 'border border-outline-100 bg-background-0'
        }`}
      >
        <GestureDetector gesture={pan}>
          <Box
            accessible
            accessibilityLabel={`Reorder step: ${subtask.title}`}
            className="h-full w-7 flex-none items-center justify-center"
          >
            <Icon as={GripVerticalIcon} size="sm" className="text-typography-300" />
          </Box>
        </GestureDetector>
        <Pressable
          accessibilityRole="button"
          aria-label={`Rewrite step: ${subtask.title}`}
          onPress={onStartRename}
          className="h-full flex-1 justify-center"
        >
          <Text
            numberOfLines={1}
            className={
              subtask.completed
                ? 'font-body text-sm text-typography-400 line-through'
                : 'font-body-medium text-sm text-typography-800'
            }
          >
            {subtask.title}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          aria-label={`Delete subtask: ${subtask.title}`}
          hitSlop={6}
          onPress={onDelete}
          className="h-8 w-8 flex-none items-center justify-center rounded-full"
        >
          <Icon as={TrashIcon} size="sm" className="text-typography-300" />
        </Pressable>
      </HStack>
    </Animated.View>
  );
}
