import { cn } from '@/lib/utils';

/**
 * Floating mini toolbar shown above a selected annotation. Carries
 * `panningDisabled`/`wheelDisabled` so react-zoom-pan-pinch ignores it, and
 * stops pointer events so clicking a control never starts a drag.
 */
export function AnnotationToolbar({
  label,
  rotation = 0,
  children,
}: {
  label: string;
  /** Counter-rotate to cancel the element's own rotation */
  rotation?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        'panningDisabled wheelDisabled absolute -top-14 left-1/2 z-50',
        'flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5',
        'bg-bg-elevated border border-border-standard shadow-lg',
      )}
      style={{ transform: `translateX(-50%) rotate(${-rotation}deg)` }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ToolbarIconButton({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center transition-colors',
        'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        destructive && 'hover:bg-error-bg hover:text-error',
      )}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}

export function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border-subtle" aria-hidden="true" />;
}
