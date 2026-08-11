import { useState } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Box } from '@/components/ui/box';

const FADE_HEIGHT = 12;
/** Slop so sub-pixel layout math never flickers a fade on/off. */
const EPSILON = 4;

/** Ground-coloured gradient lip (saved listClipMode, spec §5): content reads
 *  as sliding under an edge rather than ending. */
function FadeEdge({ position, color }: { position: 'top' | 'bottom'; color: string }) {
  return (
    <Box
      pointerEvents="none"
      className={`absolute left-0 right-0 ${position === 'top' ? 'top-0' : 'bottom-0'}`}
      style={{ height: FADE_HEIGHT }}
    >
      <Svg width="100%" height={FADE_HEIGHT}>
        <Defs>
          <LinearGradient
            id={`fade-${position}`}
            x1="0"
            y1={position === 'top' ? '0' : '1'}
            x2="0"
            y2={position === 'top' ? '1' : '0'}
          >
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={FADE_HEIGHT} fill={`url(#fade-${position})`} />
      </Svg>
    </Box>
  );
}

/**
 * ScrollView with scroll-aware soft edges (2026-08-11 item 4): each fade
 * only appears when there is actually content hidden past that edge — no
 * fade at all when everything fits, no top fade at the top, no bottom fade
 * at the bottom.
 *
 * Layout-neutral wrapper: pass the classes the plain ScrollView's container
 * used via `containerClassName`.
 */
export function FadedScrollView({
  containerClassName,
  fadeColor = '#F4F6F5',
  children,
  onScroll,
  onLayout,
  onContentSizeChange,
  ...props
}: ScrollViewProps & {
  containerClassName?: string;
  /** The ground the content sits on — the fades dissolve into it. */
  fadeColor?: string;
}) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);

  const scrollable = contentHeight > viewportHeight + EPSILON;
  const showTop = scrollable && offset > EPSILON;
  const showBottom = scrollable && offset + viewportHeight < contentHeight - EPSILON;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffset(event.nativeEvent.contentOffset.y);
    onScroll?.(event);
  };
  const handleLayout = (event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
    onLayout?.(event);
  };
  const handleContentSizeChange = (width: number, height: number) => {
    setContentHeight(height);
    onContentSizeChange?.(width, height);
  };

  return (
    <Box className={containerClassName}>
      <ScrollView
        {...props}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
      >
        {children}
      </ScrollView>
      {showTop ? <FadeEdge position="top" color={fadeColor} /> : null}
      {showBottom ? <FadeEdge position="bottom" color={fadeColor} /> : null}
    </Box>
  );
}
