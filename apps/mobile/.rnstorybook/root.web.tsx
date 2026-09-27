// Web root: renders stories for the design canvas (apps/canvas), whose frames
// are iframes onto this page. Same Metro + NativeWind + babel pipeline as the
// app, and the same story tree as the native root's single-story mode, so a
// frame is the real component, not a copy.
//
//   ?id=<story-id>          one story filling the frame (a screen)
//   ?title=<meta-title>&w=  every story of one component side by side, each
//                           `w` px wide (a component-library row); its size is
//                           posted to the parent so the canvas can fit it
//   &insets=<top>,<bottom>  device safe-area insets (dp) — screens get the
//                           padding they get on the phone, plus a drawn status
//                           bar and gesture handle in those areas
//   &keyboard=1             raise the mock keyboard (also `parameters.canvas
//                           .keyboard` on the story)
//   (neither id nor title)  a clickable index of every story — also posted to
//                           the parent, which is how the canvas lists stories
//                           it has not placed on a journey yet
//
// Framed stories also forward canvas navigation the story itself cannot use
// (a live iframe swallows every event over it): wheels with nothing left to
// scroll, middle-button drags, and middle-held / pinch wheels for zooming.
// They also snapshot themselves (JPEG → parent) shortly after mounting and
// whenever the canvas asks — the canvas shows those pictures when zoomed out
// or off screen, so only nearby frames run a live bundle.
import { domToJpeg } from 'modern-screenshot';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  ComponentRow,
  DEFAULT_GROUP_ITEM_WIDTH,
  RendererProviders,
  ScreenFrame,
} from './story-frames';
import { collectStories, type StoryEntry } from './story-registry';
import { setMockKeyboard, watchMockKeyboard } from './web-shims/keyboard';

// NativeWind resolves `rem` to 14px on native but the browser's is 16px, so
// every rem-based utility (leading-5, gap-2.5, the default spacing scale)
// came out 14% larger on web. Match the device.
document.documentElement.style.fontSize = '14px';

/** Envelope for every message to the canvas — lets it ignore foreign frames. */
const MESSAGE_SOURCE = 'one-down-story';
/** Envelope the canvas uses for its requests back to a frame. */
const CANVAS_SOURCE = 'one-down-canvas';
/** Long enough for fonts, images and entering animations to settle. */
const FIRST_SNAPSHOT_DELAY_MS = 1500;
/**
 * Gboard on a Pixel (API 35, gesture nav), measured on the emulator: it covers
 * 336dp including the gesture area, but RN reports `endCoordinates.height`
 * WITHOUT the navigation-bar inset (312dp) — mirrored below.
 */
const MOCK_KEYBOARD_HEIGHT = 336;
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

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

/**
 * Fixed device insets instead of the browser's (always zero), so SafeAreaView
 * and useSafeAreaInsets pad a screen exactly as on the phone.
 */
function DeviceSafeArea({
  top,
  bottom,
  children,
}: {
  top: number;
  bottom: number;
  children: ReactNode;
}) {
  const [frame, setFrame] = useState({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const onResize = () =>
      setFrame({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const insets = useMemo(() => ({ top, bottom, left: 0, right: 0 }), [top, bottom]);
  return (
    <SafeAreaFrameContext.Provider value={frame}>
      <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

/** Android status bar and gesture handle, drawn into the inset areas the app draws behind. */
function SystemBars({ top, bottom }: { top: number; bottom: number }) {
  const ink = '#1f1b16';
  return (
    <>
      {top > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: top,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ fontFamily: 'Karla_500Medium', fontSize: 14, color: ink }}>9:41</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 14,
                height: 10,
                borderRadius: 2,
                backgroundColor: ink,
                opacity: 0.85,
              }}
            />
            <View
              style={{
                width: 22,
                height: 11,
                borderRadius: 3,
                borderWidth: 1.5,
                borderColor: ink,
                padding: 1.5,
              }}
            >
              <View style={{ flex: 1, width: '70%', borderRadius: 1, backgroundColor: ink }} />
            </View>
          </View>
        </View>
      )}
      {bottom > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: bottom,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{ width: 108, height: 4, borderRadius: 2, backgroundColor: ink, opacity: 0.4 }}
          />
        </View>
      )}
    </>
  );
}

/**
 * A Gboard-shaped keyboard over the frame's bottom, raising real keyboard
 * events (web-shims/keyboard) so the story pads itself as on the device.
 * Hides when the story dismisses the keyboard.
 */
function MockKeyboard({ navBarInset }: { navBarInset: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const stop = watchMockKeyboard(setVisible);
    // Focus the story's first field, as tapping it on the phone would.
    const field = document.querySelector<HTMLElement>('input, textarea');
    field?.focus({ preventScroll: true });
    setMockKeyboard({
      screenX: 0,
      screenY: window.innerHeight - MOCK_KEYBOARD_HEIGHT,
      width: window.innerWidth,
      height: MOCK_KEYBOARD_HEIGHT - navBarInset,
    });
    return () => {
      stop();
      setMockKeyboard(null);
    };
  }, [navBarInset]);
  if (!visible) return null;
  const key = {
    flex: 1,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: MOCK_KEYBOARD_HEIGHT,
        backgroundColor: '#e8eaed',
        paddingTop: 44,
        paddingHorizontal: 4,
        gap: 10,
      }}
    >
      {KEY_ROWS.map((row, index) => (
        <View
          key={row}
          style={{
            flexDirection: 'row',
            gap: 5,
            paddingHorizontal: index === 1 ? 18 : index === 2 ? 44 : 0,
          }}
        >
          {[...row].map((letter) => (
            <View key={letter} style={key}>
              <Text style={{ fontSize: 20, color: '#1f1f1f' }}>{letter}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 44 }}>
        <View style={[key, { flex: 5 }]} />
      </View>
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
  const [insetTop = 0, insetBottom = 0] = (params.get('insets') ?? '').split(',').map(Number);
  useCanvasSnapshots(Boolean(id || title));
  useCanvasInputForwarding(Boolean(id || title));

  if (id) {
    const entry = stories.find((story) => story.id === id);
    if (!entry) return <Text style={{ padding: 16 }}>No story with id “{id}”.</Text>;
    const keyboard = entry.canvas.keyboard === true || params.get('keyboard') === '1';
    // The keyboard covers the gesture area, as Gboard does.
    const bottom = keyboard ? 0 : insetBottom;
    return (
      <DeviceSafeArea top={insetTop} bottom={bottom}>
        <ScreenFrame entry={entry} />
        <SystemBars top={insetTop} bottom={bottom} />
        {keyboard && <MockKeyboard navBarInset={insetBottom} />}
      </DeviceSafeArea>
    );
  }
  if (title) {
    const entries = stories.filter((story) => story.title === title);
    const itemWidth = Number(params.get('w')) || DEFAULT_GROUP_ITEM_WIDTH;
    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      postToCanvas({ type: 'size', key: `title:${title}`, width, height });
    };
    return entries.length > 0 ? (
      <DeviceSafeArea top={0} bottom={0}>
        <ComponentRow entries={entries} itemWidth={itemWidth} onLayout={onLayout} />
      </DeviceSafeArea>
    ) : (
      <Text style={{ padding: 16 }}>No stories titled “{title}”.</Text>
    );
  }
  return <StoryIndex stories={stories} />;
}

export default function StoryRendererRoot() {
  const [stories] = useState(collectStories);
  return (
    <RendererProviders>
      <Route stories={stories} />
    </RendererProviders>
  );
}
