import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { MIN_IMAGE_WIDTH, type CanvasImage } from '@/lib/types/canvas-annotations';
import { cn } from '@/lib/utils';
import { AnnotationToolbar, ToolbarIconButton } from './annotation-toolbar';
import { useDrag } from './use-drag';

export interface CanvasImageItemProps {
  image: CanvasImage;
  editable: boolean;
  selected: boolean;
  getScale: () => number;
  onSelect: (id: string | null) => void;
  onUpdate: (image: CanvasImage) => void;
  onDelete: () => void;
}

/**
 * Aspect-locked resize. Shared by the pointer drag and the keyboard path so the
 * two cannot diverge; falls back to a square ratio for a zero-width natural size.
 */
function resizedTo(image: CanvasImage, width: number): CanvasImage {
  const aspect = image.naturalWidth > 0 ? image.naturalHeight / image.naturalWidth : 1;
  const next = Math.max(MIN_IMAGE_WIDTH, width);
  return { ...image, width: Math.round(next), height: Math.round(next * aspect) };
}

export function CanvasImageItem({
  image,
  editable,
  selected,
  getScale,
  onSelect,
  onUpdate,
  onDelete,
}: CanvasImageItemProps) {
  // Geometry at pointer-down. The drag handlers are recreated every render, so
  // `image` inside them is always current; only the origin needs a ref.
  const originRef = useRef({ x: image.x, y: image.y, width: image.width });

  const move = useDrag({
    getScale,
    onStart: () => {
      originRef.current = { x: image.x, y: image.y, width: image.width };
    },
    onMove: (dx, dy) => {
      onUpdate({
        ...image,
        x: Math.round(originRef.current.x + dx),
        y: Math.round(originRef.current.y + dy),
      });
    },
    onEnd: (didDrag) => {
      if (!didDrag) onSelect(image.id);
    },
  });

  const resize = useDrag({
    getScale,
    onStart: () => {
      originRef.current = { x: image.x, y: image.y, width: image.width };
    },
    onMove: (dx) => {
      onUpdate(resizedTo(image, originRef.current.width + dx));
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editable) return;
    // Focused but not selected: Enter selects. Every other key must bubble
    // untouched, including Space (the page's Space-to-pan) and the arrow keys
    // (the page's frame navigation).
    if (!selected) {
      if (e.key === 'Enter') {
        onSelect(image.id);
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const nudge = e.shiftKey ? 32 : 8;
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        onDelete();
        break;
      case 'Escape':
        onSelect(null);
        break;
      case 'ArrowLeft':
        onUpdate({ ...image, x: image.x - nudge });
        break;
      case 'ArrowRight':
        onUpdate({ ...image, x: image.x + nudge });
        break;
      case 'ArrowUp':
        onUpdate({ ...image, y: image.y - nudge });
        break;
      case 'ArrowDown':
        onUpdate({ ...image, y: image.y + nudge });
        break;
      case '=':
      case '+':
        onUpdate(resizedTo(image, image.width + nudge));
        break;
      case '-':
      case '_':
        onUpdate(resizedTo(image, image.width - nudge));
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const fileName = image.src.split('/').pop() ?? image.id;

  return (
    <div
      data-annotation
      className={cn(
        'panningDisabled group absolute select-none',
        'focus-visible:outline-none',
        // Focus ring is deliberately unlike the selection ring. Applied only when
        // unselected: a `focus-visible:` variant outranks a bare `ring-*` on CSS
        // specificity, so keeping both would let focus repaint the accent ring.
        !selected &&
          'focus-visible:ring-2 focus-visible:ring-border-subtle focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-base',
        editable && (move.dragging ? 'cursor-grabbing' : 'cursor-grab'),
      )}
      style={{
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
        zIndex: move.dragging || resize.dragging || selected ? 50 : 30,
      }}
      tabIndex={editable ? 0 : -1}
      role="group"
      aria-label={`Image ${fileName}. Enter to select, then arrows to move, plus and minus to resize, Delete to remove.`}
      onKeyDown={handleKeyDown}
      {...(editable ? move.handlers : {})}
    >
      {selected && editable && (
        <AnnotationToolbar label="Image options">
          <ToolbarIconButton icon={Trash2} label="Delete image" onClick={onDelete} destructive />
        </AnnotationToolbar>
      )}

      <img
        src={image.src}
        alt=""
        draggable={false}
        width={image.naturalWidth}
        height={image.naturalHeight}
        className="pointer-events-none block h-full w-full shadow-lg"
      />

      {selected && editable && (
        <div
          aria-hidden="true"
          className="panningDisabled absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize bg-accent ring-2 ring-bg-elevated"
          {...resize.handlers}
        />
      )}
    </div>
  );
}
