import type { LocalTask } from '@one-down/shared/schema-local';
import { useCallback, useState } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Box } from '@/components/ui/box';
import { TaskCard } from '@/components/task-card/task-card';

import { EmptyState } from './empty-state';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const DISMISS_X = SCREEN_WIDTH * 1.2;

export type CardStackProps = {
  cards: LocalTask[];
};

export function CardStack({ cards }: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    translateX.value = 0;
  }, [translateX]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * DISMISS_X, { duration: 250 }, () => {
          scheduleOnRN(advanceCard);
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  if (cards.length === 0 || currentIndex >= cards.length) {
    return <EmptyState />;
  }

  const visibleCards = cards.slice(currentIndex, currentIndex + 3);

  return (
    <Box className="flex-1 items-center justify-center px-4">
      <Box className="relative w-full" style={{ height: 280 }}>
        {visibleCards
          .map((card, stackIndex) => {
            if (stackIndex === 0) {
              return (
                <TopCard key={card.id} task={card} gesture={panGesture} translateX={translateX} />
              );
            }
            return <BackgroundCard key={card.id} task={card} stackIndex={stackIndex} />;
          })
          .reverse()}
      </Box>
    </Box>
  );
}

type TopCardProps = {
  task: LocalTask;
  gesture: ReturnType<typeof Gesture.Pan>;
  translateX: SharedValue<number>;
};

function TopCard({ task, gesture, translateX }: TopCardProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${(translateX.value / SCREEN_WIDTH) * 15}deg` },
    ],
    opacity: 1 - Math.min(Math.abs(translateX.value) / DISMISS_X, 0.5),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ position: 'absolute', width: '100%' }, animatedStyle]}
        accessibilityLabel="Top card"
        accessibilityHint="Swipe left or right to see next task"
      >
        <TaskCard task={task} />
      </Animated.View>
    </GestureDetector>
  );
}

type BackgroundCardProps = {
  task: LocalTask;
  stackIndex: number;
};

function BackgroundCard({ task, stackIndex }: BackgroundCardProps) {
  const scale = 1 - stackIndex * 0.05;
  const translateY = stackIndex * 12;
  const opacity = stackIndex === 1 ? 0.7 : 0.4;

  return (
    <Box
      style={{
        position: 'absolute',
        width: '100%',
        transform: [{ scale }, { translateY }],
        opacity,
      }}
      pointerEvents="none"
    >
      <TaskCard task={task} />
    </Box>
  );
}
