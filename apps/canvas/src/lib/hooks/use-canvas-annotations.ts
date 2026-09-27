import { useCallback, useEffect, useRef, useState } from 'react';
import { initialImageSize } from '@/components/canvas/coords';
import {
  deleteImageFile,
  fetchAnnotations,
  saveAnnotations,
  uploadImage,
} from '@/lib/api/canvas-annotations-client';
import { createAutosaver, type Autosaver, type SaveState } from '@/lib/autosaver';
import {
  EMPTY_ANNOTATIONS,
  type CanvasAnnotations,
  type CanvasImage,
  type StickyNote,
} from '@/lib/types/canvas-annotations';

const AUTOSAVE_DELAY_MS = 500;
const SAVED_INDICATOR_MS = 1500;

export interface ImagePlacement {
  x: number;
  y: number;
  /** "top-left" puts the image's corner at (x, y); "center" centres it there. */
  anchor: 'top-left' | 'center';
}

/**
 * Why the document on screen is not the stored one:
 * - "network": the request itself failed.
 * - "invalid": the stored file could not be read or validated.
 *
 * A missing file is not a problem — it is the normal first run, and editing it
 * creates the file.
 */
export type AnnotationsLoadProblem = 'network' | 'invalid';

export interface UseCanvasAnnotationsResult {
  annotations: CanvasAnnotations;
  loaded: boolean;
  /**
   * Non-null when the initial load did not give us the stored document. Autosave stays
   * disarmed and editing is refused, so an empty document cannot overwrite a file the
   * user could still repair. Callers should also hide their editing affordances.
   */
  loadProblem: AnnotationsLoadProblem | null;
  saveState: SaveState;
  setImages: (updater: (prev: CanvasImage[]) => CanvasImage[]) => void;
  setStickies: (updater: (prev: StickyNote[]) => StickyNote[]) => void;
  /** Refused with an error when `loadProblem` is set, so no orphan file is uploaded. */
  addImageFromFile: (
    file: File,
    placement: ImagePlacement,
  ) => Promise<{ image?: CanvasImage; error?: string }>;
  /** A no-op when `loadProblem` is set. */
  removeImage: (id: string) => void;
}

const EDITING_DISABLED = 'Annotations did not load; editing is disabled.';

export function useCanvasAnnotations({
  editable,
}: {
  editable: boolean;
}): UseCanvasAnnotationsResult {
  const [annotations, setAnnotations] = useState<CanvasAnnotations>(EMPTY_ANNOTATIONS);
  const [loaded, setLoaded] = useState(false);
  const [loadProblem, setLoadProblem] = useState<AnnotationsLoadProblem | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const autosaverRef = useRef<Autosaver<CanvasAnnotations> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set by local edits so the effect below knows to schedule a save (and not on initial load). */
  const dirtyRef = useRef(false);
  /**
   * True once any local edit has happened. Unlike `dirtyRef` (which the autosave
   * effect resets), this is never reset, so the initial load can tell whether the
   * user has already edited and must not be clobbered by the server document.
   */
  const hasLocalEditsRef = useRef(false);

  // Create the autosaver once.
  useEffect(() => {
    const saver = createAutosaver<CanvasAnnotations>({
      save: saveAnnotations,
      delayMs: AUTOSAVE_DELAY_MS,
      onStateChange: (state) => {
        setSaveState(state);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        if (state === 'saved') {
          savedTimerRef.current = setTimeout(() => setSaveState('idle'), SAVED_INDICATOR_MS);
        }
      },
    });
    autosaverRef.current = saver;
    return () => {
      saver.dispose();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Load once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchAnnotations()
      .then(({ doc, status }) => {
        if (cancelled) return;
        if (status === 'invalid') {
          // The stored file exists but could not be read, so the empty document we
          // were handed must not be autosaved over a file the user can still repair.
          // oxlint-disable-next-line no-console
          console.warn('[canvas] the stored annotations are invalid; editing is disabled');
          setLoadProblem('invalid');
          return;
        }
        // If the user edited before the fetch resolved, the edited document is
        // already queued in the autosaver; overwriting state here would show the
        // server doc while the autosaver persists the discarded local one.
        if (!hasLocalEditsRef.current) setAnnotations(doc);
      })
      .catch((error: unknown) => {
        // oxlint-disable-next-line no-console
        console.warn('[canvas] could not load annotations', error);
        // The document we are showing is not the committed one, so autosaving any
        // edit from here would overwrite the real file with an empty document.
        if (!cancelled) setLoadProblem('network');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Schedule a save after any local change.
  useEffect(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    if (editable && loadProblem === null) autosaverRef.current?.schedule(annotations);
  }, [annotations, editable, loadProblem]);

  const update = useCallback((updater: (prev: CanvasAnnotations) => CanvasAnnotations) => {
    dirtyRef.current = true;
    hasLocalEditsRef.current = true;
    setAnnotations(updater);
  }, []);

  const setImages = useCallback(
    (updater: (prev: CanvasImage[]) => CanvasImage[]) =>
      update((prev) => ({ ...prev, images: updater(prev.images) })),
    [update],
  );

  const setStickies = useCallback(
    (updater: (prev: StickyNote[]) => StickyNote[]) =>
      update((prev) => ({ ...prev, stickies: updater(prev.stickies) })),
    [update],
  );

  const addImageFromFile = useCallback(
    async (
      file: File,
      placement: ImagePlacement,
    ): Promise<{ image?: CanvasImage; error?: string }> => {
      // Refuse before uploading: an upload we could never record in the document
      // would leave an orphan file in the repo.
      if (loadProblem !== null) return { error: EDITING_DISABLED };
      try {
        const uploaded = await uploadImage(file);
        const size = initialImageSize(uploaded.naturalWidth, uploaded.naturalHeight);
        const x = placement.anchor === 'center' ? placement.x - size.width / 2 : placement.x;
        const y = placement.anchor === 'center' ? placement.y - size.height / 2 : placement.y;
        const image: CanvasImage = { ...uploaded, ...size, x: Math.round(x), y: Math.round(y) };
        setImages((prev) => [...prev, image]);
        return { image };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Upload failed' };
      }
    },
    [loadProblem, setImages],
  );

  const removeImage = useCallback(
    (id: string) => {
      // Deleting the file while the document cannot be saved would drop an image
      // that the stored file still references.
      if (loadProblem !== null) return;
      setImages((prev) => prev.filter((image) => image.id !== id));
      deleteImageFile(id).catch((error: unknown) => {
        // oxlint-disable-next-line no-console
        console.warn(`[canvas] could not delete image file ${id}`, error);
      });
    },
    [loadProblem, setImages],
  );

  return {
    annotations,
    loaded,
    loadProblem,
    saveState,
    setImages,
    setStickies,
    addImageFromFile,
    removeImage,
  };
}
