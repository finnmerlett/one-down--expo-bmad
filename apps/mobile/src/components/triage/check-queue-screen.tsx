import { Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { cssInterop } from 'nativewind';

import type { TaskData } from '@one-down/shared';

import { BlueprintCard, type BlueprintDraft } from '@/components/triage/blueprint-card';
import { Box } from '@/components/ui/box';
import { ArrowLeftIcon, Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

// Third-party component — NativeWind only auto-interops react-native core.
cssInterop(SafeAreaView, { className: 'style' });

const GROUND = '#16283F';
const RAIL_DONE = '#A6C8EE';

/** Card exit (9-5 item 10): the saved blueprint flies straight up and away,
 *  revealing the next card mounting beneath. Also plays on skip — one
 *  coherent exit for every departure keeps the queue feeling mechanical. */
const CARD_EXIT_MS = 380;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const blueprintFlyUp = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: 0 }] },
    animations: {
      transform: [
        {
          translateY: withTiming(-SCREEN_HEIGHT, {
            duration: CARD_EXIT_MS,
            easing: Easing.in(Easing.quad),
          }),
        },
      ],
    },
  };
};

/** 26px blueprint grid (spec §9) — one static SVG under everything. */
function GridGround() {
  const { width, height } = Dimensions.get('window');
  const step = 26;
  const stroke = 'rgba(160,200,245,0.055)';
  const columns = Array.from({ length: Math.ceil(width / step) }, (_, index) => index * step);
  const rows = Array.from({ length: Math.ceil(height / step) }, (_, index) => index * step);
  return (
    <Box pointerEvents="none" className="absolute inset-0">
      <Svg width={width} height={height}>
        {columns.map((x) => (
          <Line key={`c${x}`} x1={x} y1={0} x2={x} y2={height} stroke={stroke} strokeWidth={1} />
        ))}
        {rows.map((y) => (
          <Line key={`r${y}`} x1={0} y1={y} x2={width} y2={y} stroke={stroke} strokeWidth={1} />
        ))}
      </Svg>
    </Box>
  );
}

/**
 * Blueprint triage (v1.5 Row D, header reads `Triage`): the check queue —
 * every active task still carrying review items — as editable dashed cards
 * over the #16283F grid. `Save and next` commits the card's draft (edited
 * fields clear their own flags; everything left is confirmed as shown);
 * `Skip this one` sends it to the queue's end without clearing anything.
 * Emptying the queue pays the +5 once/day (wired inside the edit services).
 *
 * The 7.3 welcome-back triage at /triage stays its own surface (ambiguity
 * #41) — this screen replaces Story 6.2's review MODE, not that list.
 *
 * Driven entirely by props: src/app/check-queue.tsx supplies the queue
 * ordering and the save / skip / delete writes; the screen stories (and so
 * the design canvas) supply fixtures. `current === null` is Queue clear.
 */
export function CheckQueueScreen({
  current,
  position,
  total,
  handledCount,
  onSave,
  onSkip,
  onDelete,
  onBack,
}: {
  /** The card at the head of the queue; `null` once the queue is empty. */
  current: TaskData | null;
  /** 1-based position shown as `position / total`. */
  position: number;
  /** The session's total (0 hides the counter and the rail). */
  total: number;
  /** Cards handled this session — fills that many rail bars. */
  handledCount: number;
  onSave: (task: TaskData, draft: BlueprintDraft) => void;
  onSkip: (task: TaskData) => void;
  onDelete: (task: TaskData) => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className="flex-1"
      style={{ backgroundColor: GROUND }}
    >
      <GridGround />
      <HStack className="items-center gap-1 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          aria-label="Back to home"
          hitSlop={8}
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Icon as={ArrowLeftIcon} size="xl" className="text-[#F2F7FD]" />
        </Pressable>
        <Text className="font-heading text-2xl" style={{ color: '#F2F7FD' }}>
          Triage
        </Text>
        <Box className="flex-1" />
        {total > 0 ? (
          <Text className="pr-2 font-mono text-sm" style={{ color: RAIL_DONE }}>
            {`${position} / ${total}`}
          </Text>
        ) : null}
      </HStack>
      {/* Segmented progress rail (4px bars) + the pay line. */}
      <VStack className="gap-2 px-6 pb-3">
        {total > 0 ? (
          <HStack className="gap-1">
            {/* 9.8 G11: bars fill by HANDLED count — the old position-1 fill
                left the last bar empty on the Queue-clear screen. */}
            {Array.from({ length: total }, (_, index) => (
              <Box
                key={index}
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor: index < handledCount ? RAIL_DONE : 'rgba(160,200,245,0.25)',
                }}
              />
            ))}
          </HStack>
        ) : null}
        <Text
          className="font-mono text-xs uppercase tracking-caps"
          style={{ color: 'rgba(160,200,245,0.7)' }}
        >
          Clear the queue · ★ 5
        </Text>
      </VStack>
      {current ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-6 pb-10">
          {/* Key swap advances the queue; the departing card plays the
              fly-up exit while the next one fades in beneath (item 10). */}
          <Animated.View key={current.id} entering={FadeIn.duration(180)} exiting={blueprintFlyUp}>
            <BlueprintCard
              task={current}
              onSave={(draft) => onSave(current, draft)}
              onSkip={() => onSkip(current)}
              onDelete={() => onDelete(current)}
            />
          </Animated.View>
        </ScrollView>
      ) : (
        <VStack className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-4xl">★</Text>
          <Text className="text-center font-heading text-2xl" style={{ color: '#F2F7FD' }}>
            Queue clear
          </Text>
          <Text className="text-center font-body text-sm" style={{ color: RAIL_DONE }}>
            Every guess has been checked. Nice one.
          </Text>
          <Pressable
            accessibilityRole="button"
            aria-label="Back to the deck"
            onPress={onBack}
            className="mt-3 h-11 items-center justify-center rounded-full px-6"
            style={{ backgroundColor: '#49BAB9' }}
          >
            <Text className="font-body-bold text-sm text-typography-0">Back to the deck</Text>
          </Pressable>
        </VStack>
      )}
    </SafeAreaView>
  );
}
