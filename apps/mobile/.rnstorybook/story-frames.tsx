// Platform-neutral story frames shared by the web and native renderer roots.
import * as Font from 'expo-font';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { APP_FONTS } from '../src/constants/fonts';

import type { StoryEntry } from './story-registry';

export const DEFAULT_GROUP_ITEM_WIDTH = 390;

export class StoryErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: '#b42318', fontWeight: '700' }}>Story crashed</Text>
        <Text style={{ color: '#b42318', fontFamily: 'monospace', fontSize: 12 }}>
          {String(this.state.error.stack ?? this.state.error)}
        </Text>
      </View>
    );
  }
}

/** One story filling the screen — what a canvas screen frame shows. */
export function ScreenFrame({ entry }: { entry: StoryEntry }) {
  const { Story } = entry;
  return (
    <StoryErrorBoundary>
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    </StoryErrorBoundary>
  );
}

/** Every state of one component side by side — a component-library row. */
export function ComponentRow({
  entries,
  itemWidth,
  onLayout,
}: {
  entries: StoryEntry[];
  itemWidth: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        gap: 32,
        padding: 24,
      }}
      onLayout={onLayout}
    >
      {entries.map(({ id, name, Story }) => (
        <View key={id} style={{ width: itemWidth, gap: 10 }}>
          <Text
            style={{
              fontFamily: 'DMMono_500Medium',
              fontSize: 12,
              letterSpacing: 1,
              color: '#8a8177',
            }}
          >
            {name.toUpperCase()}
          </Text>
          <StoryErrorBoundary>
            <Story />
          </StoryErrorBoundary>
        </View>
      ))}
    </View>
  );
}

/** The app's fonts and gesture root — what src/app/_layout.tsx gives every screen. */
export function RendererProviders({ children }: { children: ReactNode }) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    void Font.loadAsync(APP_FONTS)
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Font load failed', error))
      .finally(() => setFontsReady(true));
  }, []);
  if (!fontsReady) return null;
  // White root on both platforms: short stories otherwise show Android's grey window background.
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {children}
    </GestureHandlerRootView>
  );
}
