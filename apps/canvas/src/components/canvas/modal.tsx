import { X } from 'lucide-react';
import { createContext, useContext, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

// Minimal stand-in for ignite's prototype-ui Modal (same part names, so the
// ported ImageDropModal reads unchanged): a portalled, Escape-closable dialog.
const CloseContext = createContext<() => void>(() => {});

export function Modal({
  isOpen,
  onClose,
  accessibilityLabel,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal(
    <CloseContext.Provider value={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={accessibilityLabel}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {children}
      </div>
    </CloseContext.Provider>,
    document.body,
  );
}

export function ModalBackdrop(props: HTMLAttributes<HTMLDivElement>) {
  const close = useContext(CloseContext);
  return <div {...props} className="absolute inset-0 bg-black/40" onClick={close} />;
}

export function ModalContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'relative w-full max-w-lg border border-border-standard bg-bg-elevated shadow-2xl',
        className,
      )}
    />
  );
}

export function ModalHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-standard px-5 py-4">
      {children}
    </div>
  );
}

export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('px-5 py-5', className)} />;
}

export function ModalCloseButton() {
  const close = useContext(CloseContext);
  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close"
      className="p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
