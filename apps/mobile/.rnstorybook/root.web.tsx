/// <reference types="@storybook/react-native/metro-env" />
// Web root: renders stories for the design canvas (apps/canvas), whose frames
// are iframes onto this page. Same Metro + NativeWind + babel pipeline as the
// app, so a frame is the real component, not a copy.
//
//   ?id=<story-id>          one story filling the frame (a screen)
//   ?title=<meta-title>&w=  every story of one component side by side, each
//                           `w` px wide (a component-library row); its size is
//                           posted to the parent so the canvas can fit it
//   (neither)               a clickable index of every story — also posted to
//                           the parent, which is how the canvas lists stories
//                           it has not placed on a journey yet
//
// Framed stories also forward canvas navigation the story itself cannot use
// (a live iframe swallows every event over it): wheels with nothing left to
// scroll, middle-button drags, and middle-held / pinch wheels for zooming.
//
// Framed stories also snapshot themselves (JPEG → parent) shortly after
// mounting and whenever the canvas asks — the canvas shows those pictures
// when zoomed out or off screen, so only nearby frames run a live bundle.
import { composeStories, setProjectAnnotations } from '@storybook/react';
import * as Font from 'expo-font';
import { domToJpeg } from 'modern-screenshot';
import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_FONTS } from '../src/constants/fonts';

import * as previewAnnotations from './preview';

setProjectAnnotations([previewAnnotations]);

/** Envelope for every message to the canvas — lets it ignore foreign frames. */
const MESSAGE_SOURCE = 'one-down-story';
/** Envelope the canvas uses for its requests back to a frame. */
const CANVAS_SOURCE = 'one-down-canvas';
const DEFAULT_GROUP_ITEM_WIDTH = 390;
/** Long enough for fonts, images and entering animations to settle. */
const FIRST_SNAPSHOT_DELAY_MS = 1500;

type StoryEntry = { id: string; title: string; name: string; Story: ComponentType };

function collectStories(): StoryEntry[] {
  const req = require.context('../src', true, /\.stories\.tsx$/);
  return req.keys().flatMap((key) => {
    const mod = req(key);
    const title: string = mod.default?.title ?? key;
    // Story exports are PascalCase; lowercase ones are fixture helpers
    // (makeTask, makeDraft…) that composeStories would otherwise wrap.
    return Object.entries(composeStories(mod))
      .filter(([exportName]) => /^[A-Z]/.test(exportName))
      .map(([, story]) => ({
        id: story.id,
        title,
        name: story.storyName ?? story.id,
        Story: story as ComponentType,
      }));
  });
}

function postToCanvas(message: Record<string, unknown>) {
  if (window.parent !== window) {
    window.parent.postMessage({ source: MESSAGE_SOURCE, ...message }, '*');
  }
}

async function postSnapshot() {
  try {
    // Faces still loading when the capture embeds them come out in the serif
    // fallback — wait until every @font-face expo-font inserted has loaded.
    await document.fonts.ready;
    const target = document.getElementById('root') ?? document.body;
    const dataUrl = await domToJpeg(target, { quality: 0.85, backgroundColor: '#ffffff' });
    postToCanvas({ type: 'snapshot', key: window.location.search, dataUrl });
  } catch (error) {
    // oxlint-disable-next-line no-console
    console.warn('Canvas snapshot failed', error);
  }
}

/** Snapshot once the story settles, then again on every canvas request. */
function useCanvasSnapshots(enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.parent === window) return;
    const timer = setTimeout(() => void postSnapshot(), FIRST_SNAPSHOT_DELAY_MS);
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: unknown; type?: unknown } | null;
      if (data?.source === CANVAS_SOURCE && data.type === 'snapshot-request') void postSnapshot();
    };
    window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [enabled]);
}

/** Would this wheel scroll something inside the story (a list, a textarea)? */
function storyCanScroll(target: EventTarget | null, dx: number, dy: number): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (dy !== 0 && /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)
        return true;
    }
    if (dx !== 0 && /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth) {
      if (dx > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0)
        return true;
    }
  }
  return false;
}

function useCanvasInputForwarding(enabled: boolean) {
  useEffect(() => {
    if (!enabled || window.parent === window) return;
    let middleDown = false;
    const onWheel = (e: WheelEvent) => {
      const middleHeld = middleDown || (e.buttons & 4) !== 0;
      if (!middleHeld && !e.ctrlKey && storyCanScroll(e.target, e.deltaX, e.deltaY)) return;
      e.preventDefault();
      postToCanvas({
        type: 'wheel',
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        ctrlKey: e.ctrlKey,
        middleHeld,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };
    const middle = (phase: 'down' | 'move' | 'up', e: MouseEvent) =>
      postToCanvas({ type: 'middle', phase, screenX: e.screenX, screenY: e.screenY });
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault(); // no autoscroll cursor
      middleDown = true;
      middle('down', e);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (middleDown) middle('move', e);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 1 || !middleDown) return;
      middleDown = false;
      middle('up', e);
    };
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('auxclick', onAuxClick, true);
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('auxclick', onAuxClick, true);
    };
  }, [enabled]);
}

class StoryErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
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

function ScreenFrame({ entry }: { entry: StoryEntry }) {
  const { Story } = entry;
  return (
    <StoryErrorBoundary>
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    </StoryErrorBoundary>
  );
}

function ComponentRow({
  title,
  entries,
  itemWidth,
}: {
  title: string;
  entries: StoryEntry[];
  itemWidth: number;
}) {
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    postToCanvas({ type: 'size', key: `title:${title}`, width, height });
  };
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

function StoryIndex({ stories }: { stories: StoryEntry[] }) {
  useEffect(() => {
    postToCanvas({
      type: 'index',
      stories: stories.map(({ id, title, name }) => ({ id, title, name })),
    });
  }, [stories]);

  const byTitle = new Map<string, StoryEntry[]>();
  for (const entry of stories)
    byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry]);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>One Down stories ({stories.length})</Text>
      {[...byTitle].map(([title, entries]) => (
        <View key={title} style={{ gap: 4 }}>
          <Pressable
            onPress={() => (window.location.search = `?title=${encodeURIComponent(title)}`)}
          >
            <Text style={{ fontWeight: '700' }}>{title}</Text>
          </Pressable>
          {entries.map((entry) => (
            <Pressable key={entry.id} onPress={() => (window.location.search = `?id=${entry.id}`)}>
              <Text style={{ color: '#2C6E6A' }}>{entry.name}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Route({ stories }: { stories: StoryEntry[] }) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const title = params.get('title');
  useCanvasSnapshots(Boolean(id || title));
  useCanvasInputForwarding(Boolean(id || title));

  if (id) {
    const entry = stories.find((story) => story.id === id);
    return entry ? (
      <ScreenFrame entry={entry} />
    ) : (
      <Text style={{ padding: 16 }}>No story with id “{id}”.</Text>
    );
  }
  if (title) {
    const entries = stories.filter((story) => story.title === title);
    const itemWidth = Number(params.get('w')) || DEFAULT_GROUP_ITEM_WIDTH;
    return entries.length > 0 ? (
      <ComponentRow title={title} entries={entries} itemWidth={itemWidth} />
    ) : (
      <Text style={{ padding: 16 }}>No stories titled “{title}”.</Text>
    );
  }
  return <StoryIndex stories={stories} />;
}

export default function StoryRendererRoot() {
  const [fontsReady, setFontsReady] = useState(false);
  const [stories] = useState(collectStories);

  useEffect(() => {
    void Font.loadAsync(APP_FONTS)
      // oxlint-disable-next-line no-console
      .catch((error: unknown) => console.warn('Font load failed', error))
      .finally(() => setFontsReady(true));
  }, []);

  if (!fontsReady) return null;
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Route stories={stories} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
