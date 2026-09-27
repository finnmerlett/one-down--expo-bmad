/**
 * Debounced save scheduler. `schedule(doc)` replaces any pending document and
 * restarts the timer. Only one save is in flight at a time; a document
 * scheduled during a save is saved once it finishes. On failure the document
 * is kept and retried on the next `schedule` call (no automatic retry loop).
 */

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface Autosaver<T> {
  schedule(doc: T): void;
  flush(): Promise<void>;
  dispose(): void;
}

export interface AutosaverOptions<T> {
  save: (doc: T) => Promise<void>;
  delayMs: number;
  onStateChange: (state: SaveState) => void;
}

export function createAutosaver<T>({
  save,
  delayMs,
  onStateChange,
}: AutosaverOptions<T>): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;
  let inFlight = false;
  let disposed = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timer = setTimeout(() => void flush(), delayMs);
  };

  async function flush(): Promise<void> {
    clearTimer();
    if (disposed || inFlight || pending === null) return;

    const doc = pending;
    pending = null;
    inFlight = true;
    onStateChange('saving');

    try {
      await save(doc);
      inFlight = false;
      if (disposed) return;
      onStateChange('saved');
      if (pending !== null) startTimer();
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn('[autosaver] save failed', error);
      inFlight = false;
      if (disposed) return;
      // Keep the failed document unless something newer arrived meanwhile.
      if (pending === null) pending = doc;
      onStateChange('error');
    }
  }

  return {
    schedule(doc: T) {
      if (disposed) return;
      pending = doc;
      startTimer();
    },
    flush,
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
