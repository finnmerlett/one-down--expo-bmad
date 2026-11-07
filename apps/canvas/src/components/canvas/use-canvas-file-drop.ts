import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCanvasFileDropOptions {
  enabled: boolean;
  onFiles: (files: File[], point: { clientX: number; clientY: number }) => void;
}

export interface FileDropHandlers {
  onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
}

function hasFiles(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Drag-and-drop of OS files onto a container. Uses an enter/leave depth
 * counter because dragenter/dragleave fire for every child element crossed.
 */
export function useCanvasFileDrop({ enabled, onFiles }: UseCanvasFileDropOptions): {
  isDraggingOver: boolean;
  handlers: FileDropHandlers;
} {
  const depthRef = useRef(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const reset = useCallback(() => {
    depthRef.current = 0;
    setIsDraggingOver(false);
  }, []);

  // A drag that ends outside this container (or is dropped on a descendant
  // that stops propagation) never fires this container's own dragleave/drop,
  // which would otherwise leave isDraggingOver stuck on. These window-level
  // listeners guarantee the highlight always clears.
  useEffect(() => {
    window.addEventListener('dragend', reset);
    window.addEventListener('drop', reset);
    return () => {
      window.removeEventListener('dragend', reset);
      window.removeEventListener('drop', reset);
    };
  }, [reset]);

  const onDragEnter = (e: React.DragEvent<HTMLElement>) => {
    if (!enabled || !hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depthRef.current += 1;
    setIsDraggingOver(true);
  };

  const onDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    // Prevented even when disabled: otherwise a dropped file navigates the
    // browser away from the app instead of being swallowed here.
    e.preventDefault();
    e.stopPropagation();
    if (!enabled) return;
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!enabled || !hasFiles(e)) return;
    e.stopPropagation();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setIsDraggingOver(false);
  };

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    if (!hasFiles(e)) return;
    // Prevented/stopped even when disabled: swallow the drop instead of
    // letting the browser navigate to the file or the event bubble further.
    e.preventDefault();
    e.stopPropagation();
    if (!enabled) return;
    const files = Array.from(e.dataTransfer.files);
    reset();
    if (files.length > 0) onFiles(files, { clientX: e.clientX, clientY: e.clientY });
  };

  return { isDraggingOver, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
