import { MousePointerClick } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { pumpShotQueue, queueShot } from '@/lib/shot-queue';
import { cn } from '@/lib/utils';

/** Wait after a failed shot before asking again (the renderer may still be bundling). */
const RETRY_MS = 4_000;
/** The iframe fires `load` before React has painted; keep the shot over it a moment longer. */
const LIVE_REVEAL_DELAY_MS = 400;

/**
 * A canvas frame. It shows a screenshot of the story (rendered by the canvas
 * dev server in headless Chrome) until it is clicked, then mounts a live
 * iframe. Every live iframe boots its own copy of the ~18 MB dev bundle and
 * they all share the canvas main thread, so the canvas keeps one live at a time.
 */
export function StoryFrame({
  src,
  shot,
  title,
  width,
  height,
  live,
  interactive,
  onActivate,
  onShotLoad,
  className,
}: {
  /** The renderer URL the live iframe loads. */
  src: string;
  /** Screenshot URL, or null until the shot versions are known. */
  shot: string | null;
  title: string;
  width: number;
  height: number;
  live: boolean;
  /** Whether a click may make the frame live and the live iframe takes pointer events. */
  interactive: boolean;
  onActivate: () => void;
  /** The loaded screenshot size in image pixels (component rows size themselves from it). */
  onShotLoad?: (width: number, height: number) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  /** The shot on screen: `shot` is the URL it was asked for, `src` what loaded (with any retry suffix). */
  const [shown, setShown] = useState<{ shot: string; src: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [liveReady, setLiveReady] = useState(false);
  const onShotLoadRef = useRef(onShotLoad);
  onShotLoadRef.current = onShotLoad;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries.some((e) => e.isIntersecting);
        // A queued load for this frame may now go ahead of off-screen ones.
        if (visibleRef.current) pumpShotQueue();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Every frame loads its shot, and again whenever the version in its URL
  // changes. The old picture stays up until the new one has loaded.
  useEffect(() => {
    if (!shot || shot === shown?.shot) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const cancel = queueShot(
      () => (visibleRef.current ? 'visible' : 'background'),
      async (priority) => {
        const image = new Image();
        image.src = `${shot}&p=${priority}${attempt > 0 ? `&r=${attempt}` : ''}`;
        try {
          // In view, decode() first so the swap doesn't stall a pan. Off screen,
          // leave decoding to the browser for when the frame is next painted.
          if (visibleRef.current) await image.decode();
          else
            await new Promise((resolve, reject) => {
              image.onload = resolve;
              image.onerror = reject;
            });
        } catch {
          if (cancelled) return;
          setFailed(true);
          retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
          return;
        }
        if (cancelled) return;
        setFailed(false);
        setShown({ shot, src: image.src });
        onShotLoadRef.current?.(image.naturalWidth, image.naturalHeight);
      },
    );
    return () => {
      cancelled = true;
      cancel();
      clearTimeout(retry);
    };
  }, [shot, shown, attempt]);

  useEffect(() => {
    if (!live) setLiveReady(false);
  }, [live]);

  return (
    <div
      ref={containerRef}
      data-story-frame
      className={cn('group/frame relative overflow-hidden bg-white', className)}
      style={{ width, height }}
      onClick={() => {
        if (!live && interactive) onActivate();
      }}
    >
      {live && (
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0"
          style={{ pointerEvents: interactive ? 'auto' : 'none' }}
          onLoad={() => setTimeout(() => setLiveReady(true), LIVE_REVEAL_DELAY_MS)}
        />
      )}
      {!(live && liveReady) &&
        (shown ? (
          <img
            src={shown.src}
            alt=""
            decoding="async"
            className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
            style={{ width }}
            draggable={false}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-text-tertiary">
            {failed ? 'Waiting for the story renderer…' : 'Rendering…'}
          </div>
        ))}
      {!live && interactive && shown && (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover/frame:opacity-100">
          <MousePointerClick className="h-3.5 w-3.5" />
          Click to interact
        </div>
      )}
    </div>
  );
}
