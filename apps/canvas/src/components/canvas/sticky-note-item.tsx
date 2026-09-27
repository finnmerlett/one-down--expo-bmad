import { useRef, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import {
  STICKY_COLORS,
  STICKY_SIZES,
  STICKY_STYLES,
  STICKY_WIDTHS,
  type StickyNote,
} from '@/lib/types/canvas-annotations';
import { cn } from '@/lib/utils';
import { AnnotationToolbar, ToolbarDivider, ToolbarIconButton } from './annotation-toolbar';
import { useDrag } from './use-drag';

/** Small deterministic rotation so notes feel hand-placed. Range roughly -2.4° to +2.4°. */
export function rotationFor(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return ((hash % 5) - 2) * 1.2;
}

export interface StickyNoteItemProps {
  note: StickyNote;
  editable: boolean;
  selected: boolean;
  getScale: () => number;
  onSelect: (id: string | null) => void;
  onUpdate: (note: StickyNote) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function StickyNoteItem({
  note,
  editable,
  selected,
  getScale,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
}: StickyNoteItemProps) {
  const [editing, setEditing] = useState(false);
  const rotation = rotationFor(note.id);

  // Position at pointer-down. The drag handlers are recreated every render, so
  // `note` inside them is always current; only the origin needs a ref.
  const originRef = useRef({ x: note.x, y: note.y });

  const drag = useDrag({
    getScale,
    onStart: () => {
      originRef.current = { x: note.x, y: note.y };
    },
    onMove: (dx, dy) => {
      onUpdate({
        ...note,
        x: Math.round(originRef.current.x + dx),
        y: Math.round(originRef.current.y + dy),
      });
    },
    onEnd: (didDrag) => {
      if (!didDrag) onSelect(note.id);
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editable || editing) return;
    // Focused but not selected: Enter selects. Every other key must bubble
    // untouched, including Space (the page's Space-to-pan) and the arrow keys
    // (the page's frame navigation).
    if (!selected) {
      if (e.key === 'Enter') {
        onSelect(note.id);
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    const nudge = e.shiftKey ? 32 : 8;
    switch (e.key) {
      case 'Enter':
        setEditing(true);
        break;
      case 'Delete':
      case 'Backspace':
        onDelete();
        break;
      case 'Escape':
        onSelect(null);
        break;
      case 'ArrowLeft':
        onUpdate({ ...note, x: note.x - nudge });
        break;
      case 'ArrowRight':
        onUpdate({ ...note, x: note.x + nudge });
        break;
      case 'ArrowUp':
        onUpdate({ ...note, y: note.y - nudge });
        break;
      case 'ArrowDown':
        onUpdate({ ...note, y: note.y + nudge });
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const dragHandlers = editable && !editing ? drag.handlers : {};

  return (
    <div
      data-annotation
      className={cn(
        'panningDisabled group absolute select-none',
        STICKY_WIDTHS[note.size],
        'focus-visible:outline-none',
        // Focus ring is deliberately unlike the selection ring. Applied only when
        // unselected: a `focus-visible:` variant outranks a bare `ring-*` on CSS
        // specificity, so keeping both would let focus repaint the accent ring.
        !selected &&
          'focus-visible:ring-2 focus-visible:ring-border-subtle focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-base',
        editable && (drag.dragging ? 'cursor-grabbing' : 'cursor-grab'),
      )}
      style={{
        left: note.x,
        top: note.y,
        transform: `rotate(${rotation}deg)`,
        zIndex: drag.dragging || selected ? 50 : 30,
      }}
      tabIndex={editable ? 0 : -1}
      role="group"
      aria-label="Sticky note. Enter to select, then Enter to edit, arrows to move, Delete to remove."
      onKeyDown={handleKeyDown}
      onDoubleClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        setEditing(true);
      }}
      {...dragHandlers}
    >
      {selected && editable && !editing && (
        <AnnotationToolbar label="Sticky note options" rotation={rotation}>
          {STICKY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onUpdate({ ...note, color })}
              className={cn(
                'h-5 w-5',
                STICKY_STYLES[color],
                note.color === color && 'ring-2 ring-accent ring-offset-1 ring-offset-bg-elevated',
              )}
              aria-label={`Colour ${color}`}
              aria-pressed={note.color === color}
            />
          ))}
          <ToolbarDivider />
          {STICKY_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onUpdate({ ...note, size })}
              className={cn(
                'px-1.5 py-0.5 text-xs font-bold uppercase',
                note.size === size
                  ? 'bg-accent text-text-on-accent'
                  : 'text-text-secondary hover:bg-bg-tertiary',
              )}
              aria-label={`Size ${size}`}
              aria-pressed={note.size === size}
            >
              {size.charAt(0)}
            </button>
          ))}
          <ToolbarDivider />
          <ToolbarIconButton icon={Copy} label="Duplicate sticky note" onClick={onDuplicate} />
          <ToolbarIconButton
            icon={Trash2}
            label="Delete sticky note"
            onClick={onDelete}
            destructive
          />
        </AnnotationToolbar>
      )}

      <div
        className={cn(
          STICKY_STYLES[note.color],
          'min-h-[7rem] p-3 shadow-[2px_4px_10px_rgba(0,0,0,0.15)]',
        )}
      >
        {editing ? (
          <textarea
            autoFocus
            className="h-24 w-full resize-none select-text bg-transparent text-sm font-medium leading-snug text-gray-800 focus:outline-none"
            value={note.text}
            onChange={(e) => onUpdate({ ...note, text: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') setEditing(false);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Sticky note text"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm font-medium leading-snug text-gray-800">
            {note.text || (editable ? 'Double-click to edit' : '')}
          </p>
        )}
      </div>
    </div>
  );
}
