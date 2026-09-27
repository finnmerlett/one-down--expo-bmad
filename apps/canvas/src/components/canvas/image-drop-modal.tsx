import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Upload } from 'lucide-react';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
} from '@/components/canvas/modal';
import { validateUpload } from '@/lib/canvas-annotations-validate';
import { ACCEPTED_IMAGE_TYPES } from '@/lib/types/canvas-annotations';
import { cn } from '@/lib/utils';
import { useCanvasFileDrop } from '@/components/canvas/use-canvas-file-drop';

export interface FileResult {
  name: string;
  error?: string;
}

export interface ImageDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Upload and place the given (already type/size-checked) files. Returns one result per file. */
  onFiles: (files: File[]) => Promise<FileResult[]>;
}

/** Swallow a drag/drop anywhere on the dialog so it can never navigate the
 * browser to the dropped file or bubble to a drop handler underneath the
 * modal (e.g. the canvas). */
function swallowDrag(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Drop zone in a dialog. Files are added the moment they are dropped or
 * picked. If every file succeeds the modal closes; otherwise it stays open
 * listing what happened so the user can see which files were skipped.
 */
export function ImageDropModal({ isOpen, onClose, onFiles }: ImageDropModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);

  const handleClose = () => {
    setResults([]);
    setBusy(false);
    onClose();
  };

  const processFiles = async (incoming: File[]) => {
    if (incoming.length === 0 || busy) return;
    setBusy(true);
    const rejected: FileResult[] = [];
    const accepted: File[] = [];
    for (const file of incoming) {
      const check = validateUpload(file.type, file.size);
      if (check.ok) accepted.push(file);
      else rejected.push({ name: file.name, error: check.error });
    }
    let uploaded: FileResult[] = [];
    try {
      uploaded = accepted.length > 0 ? await onFiles(accepted) : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      uploaded = accepted.map((file) => ({ name: file.name, error: message }));
    } finally {
      setBusy(false);
    }
    const all = [...uploaded, ...rejected];
    if (all.every((r) => !r.error)) {
      handleClose();
    } else {
      setResults(all);
    }
  };

  const zoneDrop = useCanvasFileDrop({
    enabled: !busy,
    onFiles: (files) => void processFiles(files),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      accessibilityLabel="Add images to the canvas"
    >
      <ModalBackdrop onDragOver={swallowDrag} onDrop={swallowDrag} />
      <ModalContent
        className="panningDisabled wheelDisabled"
        onDragOver={swallowDrag}
        onDrop={swallowDrag}
      >
        <ModalHeader>
          <div className="flex items-center gap-3">
            <ImagePlus className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">Add images</h2>
          </div>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop PNG or JPEG images here, or press Enter to browse"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            {...zoneDrop.handlers}
            className={cn(
              'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors',
              'border-2 border-dashed cursor-pointer',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              zoneDrop.isDraggingOver
                ? 'border-accent bg-accent/5'
                : 'border-border-subtle hover:border-border-standard',
              busy && 'opacity-60 pointer-events-none',
            )}
          >
            <Upload className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
            <div className="text-sm font-medium text-text-primary">
              {busy ? 'Adding images…' : 'Drop images here'}
            </div>
            <div className="text-xs text-text-tertiary">
              PNG or JPEG, under 10 MB each. Or click to browse.
            </div>
          </div>

          {/* Outside the drop zone: a programmatic click on this input must not bubble back into the zone's onClick. */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void processFiles(files);
            }}
          />

          {/* Mounted unconditionally so the live region exists before its content
           * changes — a region inserted in the same mutation as its content is
           * typically not announced by screen readers. */}
          <div aria-live="polite">
            {results.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-sm">
                {results.map((result, index) => (
                  <li key={`${result.name}-${index}`} className="flex items-start gap-2">
                    {result.error ? (
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-error"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-text-primary break-all">{result.name}</span>
                      <span className="text-text-secondary">
                        {result.error ? ` — ${result.error}` : ' — added'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
