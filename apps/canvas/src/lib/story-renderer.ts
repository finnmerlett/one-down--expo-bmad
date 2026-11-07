import { useEffect, useState, useSyncExternalStore } from 'react';

import { shotVersionFor, type ShotVersions } from './shot-versions';

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

/** Size and density of a frame screenshot. Rows are cropped to their measured size. */
export interface ShotOptions {
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  row?: boolean;
}

/** A frame screenshot from the canvas dev server (src/lib/server/screenshots.ts). */
export function shotUrl(rendererUrl: string, options: ShotOptions, versions: ShotVersions) {
  const query = new URL(rendererUrl).search;
  const params = new URLSearchParams({
    q: query,
    vw: String(options.viewportWidth),
    vh: String(options.viewportHeight),
    dpr: String(options.scale),
    v: String(shotVersionFor(versions, query)),
  });
  if (options.row) params.set('row', '1');
  return `/api/shots/image?${params}`;
}

/**
 * Per-frame source versions for screenshots. The server pushes new ones over
 * Vite's HMR socket when a source change reaches some frames; only the frames
 * whose version moved get a new shot URL and refetch.
 */
let shotVersions: ShotVersions | null = null;
const versionListeners = new Set<() => void>();
function setShotVersions(versions: ShotVersions) {
  shotVersions = versions;
  for (const listener of versionListeners) listener();
}
void fetch('/api/shots/versions')
  .then((response) => response.json() as Promise<ShotVersions>)
  .then(setShotVersions)
  .catch(() => setShotVersions({ global: Date.now(), stories: {}, titles: {} }));
import.meta.hot?.on('canvas:shots', setShotVersions);

export function useShotVersions(): ShotVersions | null {
  return useSyncExternalStore(
    (listener) => {
      versionListeners.add(listener);
      return () => versionListeners.delete(listener);
    },
    () => shotVersions,
  );
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
