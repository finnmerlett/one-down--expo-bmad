import { useEffect, useState } from 'react';
import { newId, type CanvasImage, type StickyNote } from '@/lib/types/canvas-annotations';
import { cn } from '@/lib/utils';
import { CanvasImageItem } from './canvas-image-item';
import { StickyNoteItem } from './sticky-note-item';

export interface AnnotationLayerProps {
  images: CanvasImage[];
  stickies: StickyNote[];
  editable: boolean;
  /** While Space is held the layer ignores pointer events so Space-drag pans over annotations. */
  spacePressed: boolean;
  getScale: () => number;
  onImagesChange: (updater: (prev: CanvasImage[]) => CanvasImage[]) => void;
  onStickiesChange: (updater: (prev: StickyNote[]) => StickyNote[]) => void;
  /** Removes the image from state and deletes its file. */
  onRemoveImage: (id: string) => void;
}

/**
 * Absolutely positioned overlay rendered inside the TransformComponent
 * content, so it pans and zooms with the journey frames. Owns selection.
 */
export function AnnotationLayer({
  images,
  stickies,
  editable,
  spacePressed,
  getScale,
  onImagesChange,
  onStickiesChange,
  onRemoveImage,
}: AnnotationLayerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deselect on pointer down anywhere outside an annotation, or on Escape.
  useEffect(() => {
    if (!selectedId) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-annotation]')) setSelectedId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // React delegates to `document`, so a textarea's stopPropagation never reaches
      // this native listener. Without this guard one Escape would both leave a
      // sticky's edit mode and deselect the note.
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=''], [contenteditable='true']"))
        return;
      if (e.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId]);

  const duplicateSticky = (note: StickyNote) => {
    const copy: StickyNote = { ...note, id: newId('sn'), x: note.x + 28, y: note.y + 28 };
    onStickiesChange((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const interactive = !spacePressed;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      role="group"
      aria-label="Canvas annotations"
    >
      <div className={cn('relative h-full w-full', interactive && '[&>*]:pointer-events-auto')}>
        {images.map((image) => (
          <CanvasImageItem
            key={image.id}
            image={image}
            editable={editable}
            selected={selectedId === image.id}
            getScale={getScale}
            onSelect={setSelectedId}
            onUpdate={(updated) =>
              onImagesChange((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            }
            onDelete={() => {
              onRemoveImage(image.id);
              setSelectedId(null);
            }}
          />
        ))}
        {stickies.map((note) => (
          <StickyNoteItem
            key={note.id}
            note={note}
            editable={editable}
            selected={selectedId === note.id}
            getScale={getScale}
            onSelect={setSelectedId}
            onUpdate={(updated) =>
              onStickiesChange((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            }
            onDuplicate={() => duplicateSticky(note)}
            onDelete={() => {
              onStickiesChange((prev) => prev.filter((s) => s.id !== note.id));
              setSelectedId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
