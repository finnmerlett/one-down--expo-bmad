import { useCallback, useEffect, useState } from 'react';

/**
 * Talks to the web story renderer (apps/mobile/.rnstorybook/root.web.tsx),
 * served by `bun run storybook:web` — Metro, the app's own toolchain — so
 * every canvas frame is an iframe onto the real component.
 */
export const RENDERER_URL: string =
  import.meta.env.VITE_STORY_RENDERER_URL ?? 'http://localhost:8083';

/** Every renderer message carries this, so stray postMessages are ignored. */
const MESSAGE_SOURCE = 'one-down-story';

export interface StoryInfo {
  id: string;
  title: string;
  name: string;
  /** The story's `parameters.canvas` (see .rnstorybook/story-registry.ts). */
  canvas?: { keyboard?: boolean; library?: boolean };
}

/** Device safe-area insets in dp: the renderer pads screens and draws system bars there. */
export interface Insets {
  top: number;
  bottom: number;
}

export const screenUrl = (storyId: string, insets?: Insets) =>
  `${RENDERER_URL}/?id=${encodeURIComponent(storyId)}${insets ? `&insets=${insets.top},${insets.bottom}` : ''}`;

export const componentRowUrl = (title: string, itemWidth: number) =>
  `${RENDERER_URL}/?title=${encodeURIComponent(title)}&w=${itemWidth}`;

export const indexUrl = () => `${RENDERER_URL}/`;

export type RendererMessage =
  | { source: typeof MESSAGE_SOURCE; type: 'index'; stories: StoryInfo[] }
  | { source: typeof MESSAGE_SOURCE; type: 'size'; key: string; width: number; height: number }
  /** `key` is the frame's query string (`?id=…` / `?title=…&w=…`). */
  | { source: typeof MESSAGE_SOURCE; type: 'snapshot'; key: string; dataUrl: string }
  /** A wheel the story could not use itself; client coords are the frame's own. */
  | {
      source: typeof MESSAGE_SOURCE;
      type: 'wheel';
      deltaX: number;
      deltaY: number;
      deltaMode: number;
      ctrlKey: boolean;
      middleHeld: boolean;
      clientX: number;
      clientY: number;
    }
  /** Middle-button drag inside a frame, in screen coords. */
  | {
      source: typeof MESSAGE_SOURCE;
      type: 'middle';
      phase: 'down' | 'move' | 'up';
      screenX: number;
      screenY: number;
    };

function isRendererMessage(data: unknown): data is RendererMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === MESSAGE_SOURCE
  );
}

export function useRendererMessages(
  handler: (message: RendererMessage, event: MessageEvent) => void,
) {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === RENDERER_ORIGIN && isRendererMessage(event.data))
        handler(event.data, event);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handler]);
}

export const RENDERER_ORIGIN = new URL(RENDERER_URL).origin;

/**
 * Map a point in a frame's own coordinates to page coordinates, via the
 * (CSS-transformed) iframe the message came from.
 */
export function framePointToPage(
  source: MessageEventSource | null,
  clientX: number,
  clientY: number,
) {
  const iframe = [...document.querySelectorAll('iframe')].find((el) => el.contentWindow === source);
  if (!iframe || iframe.clientWidth === 0) return null;
  const rect = iframe.getBoundingClientRect();
  const scale = rect.width / iframe.clientWidth;
  return { x: rect.left + clientX * scale, y: rect.top + clientY * scale };
}

/** Ask a live frame for a fresh snapshot (it answers with a 'snapshot' message). */
export function requestSnapshot(frame: Window) {
  frame.postMessage({ source: 'one-down-canvas', type: 'snapshot-request' }, RENDERER_ORIGIN);
}

/** Last snapshot per frame key — survives frame unmounts and device switches. */
const snapshots = new Map<string, string>();

export function useFrameSnapshot(key: string): string | undefined {
  const [snapshot, setSnapshot] = useState(() => snapshots.get(key));
  useRendererMessages(
    useCallback(
      (message: RendererMessage) => {
        if (message.type !== 'snapshot' || message.key !== key) return;
        snapshots.set(key, message.dataUrl);
        setSnapshot(message.dataUrl);
      },
      [key],
    ),
  );
  return snapshot;
}

export type IndexState =
  | { status: 'loading' }
  | { status: 'ready'; stories: StoryInfo[] }
  /** Nothing answered — the renderer is almost certainly not running. */
  | { status: 'unreachable' };

const INDEX_TIMEOUT_MS = 20_000;

/**
 * The story index arrives from a hidden renderer iframe (see StoryIndexProbe).
 * The renderer re-posts it on every hot reload, so new stories show up live.
 */
export function useStoryIndex(): [IndexState, (message: RendererMessage) => void] {
  const [state, setState] = useState<IndexState>({ status: 'loading' });
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setState((current) => (current.status === 'loading' ? { status: 'unreachable' } : current)),
      INDEX_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, []);
  const onMessage = (message: RendererMessage) => {
    if (message.type === 'index') setState({ status: 'ready', stories: message.stories });
  };
  return [state, onMessage];
}

/**
 * Every iframe boots its own copy of the app bundle, and same-site iframes
 * share one main thread — mounting dozens at once freezes the page. Frames
 * queue here once they scroll into view and mount a few at a time.
 */
const MAX_CONCURRENT_LOADS = 2;
let activeLoads = 0;
const waiting: Array<{ cancelled: boolean; grant: () => void }> = [];

/** Queue for a load slot; returns a cancel function (safe to call after the grant). */
export function requestLoadSlot(onGranted: () => void): () => void {
  const ticket = { cancelled: false, grant: onGranted };
  if (activeLoads < MAX_CONCURRENT_LOADS) {
    activeLoads += 1;
    onGranted();
  } else {
    waiting.push(ticket);
  }
  return () => {
    ticket.cancelled = true;
  };
}

export function releaseLoadSlot() {
  activeLoads = Math.max(0, activeLoads - 1);
  let next = waiting.shift();
  while (next?.cancelled) next = waiting.shift();
  if (next) {
    activeLoads += 1;
    next.grant();
  }
}
