import { useEffect, useRef, useState } from 'react';

import {
  releaseLoadSlot,
  requestLoadSlot,
  requestSnapshot,
  useFrameSnapshot,
} from '@/lib/story-renderer';
import { cn } from '@/lib/utils';

/**
 * Every live frame boots its own copy of the ~18 MB dev bundle (~0.9 s, ~50 MB
 * heap), and same-origin iframes share one main thread and one heap. So a
 * frame only runs live while it is on screen AND the canvas is zoomed in
 * enough to read it; otherwise it shows the last snapshot the renderer sent.
 */
const LIVE_SCALE = 0.35;
/** Grace period before an off-screen frame unloads, so quick pans don't thrash. */
const OFFSCREEN_UNMOUNT_MS = 8_000;
/** How long to wait for a fresh snapshot before unloading regardless. */
const SNAPSHOT_WAIT_MS = 1_500;
/** Give a frame this long to fire `load` before its slot goes to the next one anyway. */
const LOAD_TIMEOUT_MS = 30_000;

export function StoryFrame({
  src,
  title,
  width,
  height,
  scale,
  interactive,
  className,
}: {
  src: string;
  title: string;
  width: number;
  height: number;
  /** Current canvas zoom. */
  scale: number;
  interactive: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const holdsSlot = useRef(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const snapshot = useFrameSnapshot(new URL(src).search);

  // Mount to go live, or — zoomed out — just long enough to produce a first snapshot.
  const wanted = visible && (scale >= LIVE_SCALE || !snapshot);

  const release = () => {
    if (!holdsSlot.current) return;
    holdsSlot.current = false;
    releaseLoadSlot();
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      {
        rootMargin: '200px',
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // holdsSlot guards StrictMode's effect re-run, which lands before the
    // granted slot's re-render — a second request would leak a slot.
    if (!wanted || mounted || holdsSlot.current) return;
    return requestLoadSlot(() => {
      holdsSlot.current = true;
      setMounted(true);
    });
  }, [wanted, mounted]);

  useEffect(() => {
    if (!mounted || ready) return;
    const timer = setTimeout(release, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mounted, ready]);

  // Unload once unwanted: snapshot the current state first, so what the
  // canvas keeps showing is what the frame looked like when it went.
  useEffect(() => {
    if (wanted || !mounted) return;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(
      () => {
        const frame = iframeRef.current?.contentWindow;
        if (frame && ready) requestSnapshot(frame);
        unmountTimer = setTimeout(
          () => {
            release();
            setMounted(false);
            setReady(false);
          },
          ready ? SNAPSHOT_WAIT_MS : 0,
        );
      },
      visible ? 0 : OFFSCREEN_UNMOUNT_MS,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(unmountTimer);
    };
  }, [wanted, mounted, ready, visible]);

  // Unmounting mid-load must not leak the slot.
  useEffect(() => release, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-white', className)}
      style={{ width, height }}
    >
      {mounted && (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          style={{ pointerEvents: interactive ? 'auto' : 'none' }}
          onLoad={() => {
            release();
            setReady(true);
          }}
        />
      )}
      {!ready &&
        (snapshot ? (
          <img
            src={snapshot}
            alt=""
            className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
            style={{ width }}
            draggable={false}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-text-tertiary">
            {mounted ? 'Loading…' : ''}
          </div>
        ))}
    </div>
  );
}
