// Adapted from nearform/ignite's canvas (src/app/canvas/page.tsx): the same
// pan/zoom stage, tools, keyboard navigation and repo-persisted annotations,
// but every frame is a live One Down story from the Metro web renderer.
import {
  ArrowRight,
  ExternalLink,
  Hand,
  Image as ImageIcon,
  LibraryBig,
  Maximize,
  Monitor,
  Moon,
  MousePointer2,
  Smartphone,
  StickyNote as StickyIcon,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';

import { AnnotationLayer } from '@/components/canvas/annotation-layer';
import { fanOffset, screenToCanvas } from '@/components/canvas/coords';
import { ImageDropModal, type FileResult } from '@/components/canvas/image-drop-modal';
import { useCanvasFileDrop } from '@/components/canvas/use-canvas-file-drop';
import { StoryFrame } from '@/components/story-frame';
import { JOURNEYS } from '@/journeys';
import { validateUpload } from '@/lib/canvas-annotations-validate';
import { useCanvasNavigation } from '@/lib/canvas-navigation';
import { useCanvasAnnotations } from '@/lib/hooks/use-canvas-annotations';
import {
  RENDERER_URL,
  componentRowUrl,
  framePointToPage,
  indexUrl,
  screenUrl,
  useRendererMessages,
  useStoryIndex,
  type StoryInfo,
} from '@/lib/story-renderer';
import { useTheme, type ThemePreference } from '@/lib/theme';
import {
  STICKY_COLORS,
  STICKY_HALF_HEIGHT_PX,
  STICKY_STYLES,
  STICKY_WIDTH_PX,
  newId,
  type StickyColor,
  type StickyNote,
} from '@/lib/types/canvas-annotations';
import { cn } from '@/lib/utils';

// One Down is portrait-only, 320–430pt wide (architecture: UI patterns).
const DEVICE_PRESETS = {
  pixel7: { width: 412, height: 915, label: 'Pixel 7' },
  iphone: { width: 393, height: 852, label: 'iPhone 15' },
  compact: { width: 360, height: 740, label: 'Compact Android' },
  small: { width: 320, height: 568, label: 'Smallest (320pt)' },
} as const;
type DeviceMode = keyof typeof DEVICE_PRESETS;

const MIN_SCALE = 0.1;
const MAX_SCALE = 2;
const INITIAL_SCALE = 0.6;
const INITIAL_PAN_X = 96;
const INITIAL_PAN_Y = 48;
/** Frames take pointer input from this zoom up; below it the canvas pans/zooms over them. */
const INTERACTIVE_SCALE = 0.8;
/** Placeholder until a component row reports its measured size. */
const ROW_FALLBACK_HEIGHT = 360;
const NOTICE_MS = 3000;
const ANNOTATIONS_EDITABLE = import.meta.env.DEV;

type Tool = 'select' | 'pan' | 'sticky';

const isEditableElement = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox');

/** Stories not placed on a journey, grouped by component title (index order). */
function libraryRows(stories: StoryInfo[]): { title: string; count: number }[] {
  const placed = new Set(JOURNEYS.flatMap((journey) => journey.frames.map((frame) => frame.story)));
  const rows = new Map<string, number>();
  for (const story of stories) {
    if (!placed.has(story.id)) rows.set(story.title, (rows.get(story.title) ?? 0) + 1);
  }
  return [...rows].map(([title, count]) => ({ title, count }));
}

export function CanvasPage() {
  const { preference, resolved, setPreference } = useTheme();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('pixel7');
  const [openFlyout, setOpenFlyout] = useState<'device' | 'theme' | 'sticky' | null>(null);
  const device = DEVICE_PRESETS[deviceMode];

  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [spacePressed, setSpacePressed] = useState(false);
  const [stickyColor, setStickyColor] = useState<StickyColor>('yellow');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isStoriesPanelOpen, setIsStoriesPanelOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [storyIndex, onIndexMessage] = useStoryIndex();
  const [rowSizes, setRowSizes] = useState<Record<string, { width: number; height: number }>>({});
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  // Scroll pans, middle-drag pans, middle-held scroll (or pinch) zooms.
  const navigation = useCanvasNavigation({
    transformRef,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
  });
  useRendererMessages(
    useCallback(
      (message, event) => {
        if (message.type === 'wheel') {
          const point = framePointToPage(event.source, message.clientX, message.clientY);
          if (point) navigation.wheel(message, point, message.middleHeld);
        } else if (message.type === 'middle') {
          if (message.phase === 'down') navigation.middleDown(message.screenX, message.screenY);
          else if (message.phase === 'move')
            navigation.middleMove(message.screenX, message.screenY);
          else navigation.middleUp();
        } else if (message.type === 'size') {
          setRowSizes((prev) => {
            const current = prev[message.key];
            if (current?.width === message.width && current?.height === message.height) return prev;
            return { ...prev, [message.key]: { width: message.width, height: message.height } };
          });
        } else {
          onIndexMessage(message);
        }
      },
      [onIndexMessage, navigation],
    ),
  );
  const storiesById = useMemo(
    () =>
      new Map(
        storyIndex.status === 'ready' ? storyIndex.stories.map((story) => [story.id, story]) : [],
      ),
    [storyIndex],
  );
  const library = useMemo(
    () => (storyIndex.status === 'ready' ? libraryRows(storyIndex.stories) : []),
    [storyIndex],
  );

  /** Origin of the transformed content; its bounding rect is canvas (0,0) on screen. */
  const contentRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(INITIAL_SCALE);
  const getScale = useCallback(() => scaleRef.current, []);
  const [transformState, setTransformState] = useState({
    scale: INITIAL_SCALE,
    positionX: INITIAL_PAN_X,
    positionY: INITIAL_PAN_Y,
  });

  const {
    annotations,
    loaded: annotationsLoaded,
    loadProblem: annotationsLoadProblem,
    saveState,
    setImages,
    setStickies,
    addImageFromFile,
    removeImage,
  } = useCanvasAnnotations({ editable: ANNOTATIONS_EDITABLE });
  const annotationsReady = annotationsLoaded && annotationsLoadProblem === null;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  const isPanEnabled = activeTool === 'pan' || spacePressed;
  const handleZoomIn = () => transformRef.current?.zoomIn(0.2, 200);
  const handleZoomOut = () => transformRef.current?.zoomOut(0.2, 200);
  const handleResetView = () =>
    transformRef.current?.setTransform(INITIAL_PAN_X, INITIAL_PAN_Y, INITIAL_SCALE, 350);

  /** Upload each file and place it; `dropPoint` null means "from the modal": centre on the viewport. */
  const placeFiles = useCallback(
    async (
      files: File[],
      dropPoint: { clientX: number; clientY: number } | null,
    ): Promise<FileResult[]> => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect)
        return files.map((file) => ({ name: file.name, error: 'Canvas is not ready yet' }));
      const scale = scaleRef.current;
      const base = dropPoint
        ? screenToCanvas(dropPoint.clientX, dropPoint.clientY, rect, scale)
        : screenToCanvas(window.innerWidth / 2, window.innerHeight / 2, rect, scale);
      const anchor = dropPoint ? 'top-left' : 'center';
      const results: FileResult[] = [];
      let placed = 0;
      for (const file of files) {
        const check = validateUpload(file.type, file.size);
        if (!check.ok) {
          results.push({ name: file.name, error: check.error });
          continue;
        }
        const offset = fanOffset(placed);
        const result = await addImageFromFile(file, {
          x: base.x + offset,
          y: base.y + offset,
          anchor,
        });
        results.push({ name: file.name, error: result.error });
        if (!result.error) placed += 1;
      }
      return results;
    },
    [addImageFromFile],
  );

  const fileDrop = useCanvasFileDrop({
    // Paused while the image modal is open so its own drop zone owns the drag.
    enabled: ANNOTATIONS_EDITABLE && annotationsReady && !isImageModalOpen,
    onFiles: (files, point) => {
      void placeFiles(files, point).then((results) => {
        const failed = results.filter((r) => r.error);
        if (failed[0]) {
          showNotice(
            `Skipped ${failed[0].name}: ${failed[0].error}${failed.length > 1 ? ` (+${failed.length - 1} more)` : ''}`,
          );
        }
      });
    },
  });

  const toggleStickyTool = useCallback(() => {
    if (activeTool === 'sticky') {
      setActiveTool('select');
      setOpenFlyout(null);
    } else {
      setOpenFlyout((open) => (open === 'sticky' ? null : 'sticky'));
    }
  }, [activeTool]);

  /** In sticky mode a click on the canvas (not on floating UI or an annotation) places a note. */
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'sticky' || spacePressed || !annotationsReady || !contentRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('.panningDisabled') || target.closest('[data-annotation]')) return;
    const rect = contentRef.current.getBoundingClientRect();
    const point = screenToCanvas(e.clientX, e.clientY, rect, scaleRef.current);
    const note: StickyNote = {
      id: newId('sn'),
      kind: 'sticky',
      x: Math.round(point.x - STICKY_WIDTH_PX.md / 2),
      y: Math.round(point.y - STICKY_HALF_HEIGHT_PX),
      text: '',
      color: stickyColor,
      size: 'md',
    };
    setStickies((prev) => [...prev, note]);
    setActiveTool('select');
  };

  // Keyboard navigation over a grid: journeys first, then component rows.
  const rowLengths = useMemo(
    () => [...JOURNEYS.map((journey) => journey.frames.length), ...library.map(() => 1)],
    [library],
  );
  const [focused, setFocused] = useState<{ row: number; col: number } | null>(null);

  /** Centre a frame at the current zoom, located from the DOM (layouts vary per device and row). */
  const panToFrame = useCallback((row: number, col: number) => {
    const ref = transformRef.current;
    const el = document.querySelector<HTMLElement>(`[data-frame="${row}:${col}"]`);
    const content = contentRef.current;
    if (!ref || !el || !content) return;
    const scale = scaleRef.current;
    const box = el.getBoundingClientRect();
    const origin = content.getBoundingClientRect();
    const centreX = (box.left - origin.left + box.width / 2) / scale;
    const centreY =
      (box.top - origin.top + Math.min(box.height, window.innerHeight / scale) / 2) / scale;
    ref.setTransform(
      window.innerWidth / 2 - centreX * scale,
      window.innerHeight / 2 - centreY * scale,
      scale,
      300,
    );
  }, []);

  // Space held = temporary pan mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableElement(e.target)) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'v') return setActiveTool('select');
      if (key === 'h') return setActiveTool('pan');
      if (ANNOTATIONS_EDITABLE && annotationsReady && key === 's') return toggleStickyTool();
      if (ANNOTATIONS_EDITABLE && annotationsReady && key === 'i') return setIsImageModalOpen(true);
      if (key === 'escape') {
        setOpenFlyout(null);
        if (activeTool === 'sticky') setActiveTool('select');
        return;
      }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      if (!focused) {
        setFocused({ row: 0, col: 0 });
        panToFrame(0, 0);
        return;
      }
      let { row, col } = focused;
      if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') col = Math.min((rowLengths[row] ?? 1) - 1, col + 1);
      if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
      if (e.key === 'ArrowDown') row = Math.min(rowLengths.length - 1, row + 1);
      col = Math.min(col, (rowLengths[row] ?? 1) - 1);
      setFocused({ row, col });
      panToFrame(row, col);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focused, rowLengths, panToFrame, toggleStickyTool, activeTool, annotationsReady]);

  const iframesInteractive =
    transformState.scale >= INTERACTIVE_SCALE && activeTool === 'select' && !spacePressed;
  const cursorClass = isPanEnabled
    ? 'cursor-grab'
    : activeTool === 'sticky'
      ? 'cursor-crosshair'
      : 'cursor-default';
  const ThemeIcon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  const dotColour = resolved === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-base">
      <StoryIndexProbe />

      {/* Floating left toolbar + zoom controls */}
      <div className="panningDisabled wheelDisabled fixed left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
        <div className="flex flex-col gap-1 rounded-lg border border-border-standard bg-bg-elevated p-1.5 shadow-lg">
          <ToolbarButton
            icon={MousePointer2}
            onClick={() => setActiveTool('select')}
            tooltip="Select (V)"
            active={activeTool === 'select'}
          />
          <ToolbarButton
            icon={Hand}
            onClick={() => setActiveTool('pan')}
            tooltip="Pan (H)"
            active={activeTool === 'pan'}
          />

          {ANNOTATIONS_EDITABLE && annotationsReady && (
            <>
              <div className="relative">
                <ToolbarButton
                  icon={StickyIcon}
                  onClick={toggleStickyTool}
                  tooltip="Sticky note (S)"
                  active={activeTool === 'sticky' || openFlyout === 'sticky'}
                />
                {openFlyout === 'sticky' && (
                  <Flyout
                    onClose={() => setOpenFlyout(null)}
                    className="flex items-center gap-1.5 p-2"
                  >
                    {STICKY_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setStickyColor(color);
                          setActiveTool('sticky');
                          setOpenFlyout(null);
                        }}
                        className={cn(
                          'h-6 w-6 transition-transform hover:scale-110',
                          STICKY_STYLES[color],
                          stickyColor === color &&
                            activeTool === 'sticky' &&
                            'ring-2 ring-accent ring-offset-1',
                        )}
                        aria-label={`Sticky colour ${color}`}
                      />
                    ))}
                  </Flyout>
                )}
              </div>
              <ToolbarButton
                icon={ImageIcon}
                onClick={() => setIsImageModalOpen(true)}
                tooltip="Add image (I) — or drop files on the canvas"
                active={isImageModalOpen}
              />
            </>
          )}

          <div className="relative">
            <ToolbarButton
              icon={Smartphone}
              onClick={() => setOpenFlyout(openFlyout === 'device' ? null : 'device')}
              tooltip={`Device: ${device.label}`}
              active={openFlyout === 'device'}
            />
            {openFlyout === 'device' && (
              <Flyout onClose={() => setOpenFlyout(null)} className="min-w-[240px] py-1">
                {(Object.keys(DEVICE_PRESETS) as DeviceMode[]).map((mode) => {
                  const preset = DEVICE_PRESETS[mode];
                  return (
                    <FlyoutItem
                      key={mode}
                      active={deviceMode === mode}
                      onClick={() => {
                        setDeviceMode(mode);
                        setOpenFlyout(null);
                      }}
                      label={preset.label}
                      detail={`${preset.width} × ${preset.height}`}
                    />
                  );
                })}
              </Flyout>
            )}
          </div>

          <div className="relative">
            <ToolbarButton
              icon={ThemeIcon}
              onClick={() => setOpenFlyout(openFlyout === 'theme' ? null : 'theme')}
              tooltip={`Canvas theme: ${preference}`}
              active={openFlyout === 'theme'}
            />
            {openFlyout === 'theme' && (
              <Flyout onClose={() => setOpenFlyout(null)} className="min-w-[160px] py-1">
                {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
                  <FlyoutItem
                    key={option}
                    active={preference === option}
                    onClick={() => {
                      setPreference(option);
                      setOpenFlyout(null);
                    }}
                    label={option[0]!.toUpperCase() + option.slice(1)}
                  />
                ))}
              </Flyout>
            )}
          </div>

          <ToolbarButton
            icon={LibraryBig}
            onClick={() => setIsStoriesPanelOpen(true)}
            tooltip="All stories"
            active={isStoriesPanelOpen}
          />
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-border-standard bg-bg-elevated p-1.5">
          <ToolbarButton icon={ZoomIn} onClick={handleZoomIn} tooltip="Zoom in" />
          <div className="select-none py-1 text-center text-xs font-medium tabular-nums text-text-secondary">
            {Math.round(transformState.scale * 100)}%
          </div>
          <ToolbarButton icon={ZoomOut} onClick={handleZoomOut} tooltip="Zoom out" />
          <ToolbarButton icon={Maximize} onClick={handleResetView} tooltip="Reset view" />
        </div>
      </div>

      {storyIndex.status === 'unreachable' && (
        <div className="panningDisabled fixed left-1/2 top-4 z-50 -translate-x-1/2 border border-warning bg-bg-elevated px-4 py-3 text-sm shadow-lg">
          <span className="font-semibold text-warning">
            Story renderer not reachable at {RENDERER_URL}.
          </span>{' '}
          Start it with <code className="font-mono">bun run storybook:web</code>, then reload.
        </div>
      )}

      <TransformWrapper
        initialScale={INITIAL_SCALE}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        initialPositionX={INITIAL_PAN_X}
        initialPositionY={INITIAL_PAN_Y}
        limitToBounds={false}
        smooth
        panning={{
          disabled: !isPanEnabled,
          excluded: ['panningDisabled'],
          velocityDisabled: false,
        }}
        doubleClick={{ excluded: ['panningDisabled'] }}
        // Wheel handling is ours (useCanvasNavigation): scroll pans rather than zooms.
        wheel={{ disabled: true }}
        onTransformed={(_, state) => {
          scaleRef.current = state.scale;
          setTransformState({
            scale: state.scale,
            positionX: state.positionX,
            positionY: state.positionY,
          });
        }}
        onInit={(ref) => {
          transformRef.current = ref;
          scaleRef.current = ref.state.scale;
        }}
      >
        <div
          data-canvas
          className={cn('relative h-screen w-screen', cursorClass)}
          style={{
            backgroundImage: `radial-gradient(circle, ${dotColour} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: `${transformState.positionX % 20}px ${transformState.positionY % 20}px`,
          }}
          onClick={handleCanvasClick}
          {...fileDrop.handlers}
        >
          {fileDrop.isDraggingOver && (
            <div
              className="pointer-events-none absolute inset-4 z-40 flex items-center justify-center border-2 border-dashed border-accent bg-accent/5"
              aria-hidden="true"
            >
              <div className="border border-border-standard bg-bg-elevated px-4 py-2 text-sm font-medium shadow-lg">
                Drop to add to canvas
              </div>
            </div>
          )}
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'visible' }}
            contentStyle={{ position: 'absolute', left: 0, top: 0 }}
          >
            <div ref={contentRef} className="relative">
              <div className="flex flex-col gap-32 p-8">
                {JOURNEYS.map((journey, row) => (
                  <section key={journey.id}>
                    <SectionLabel title={journey.title} detail={`${journey.frames.length} screens`}>
                      {journey.description}
                    </SectionLabel>
                    <div className="flex items-start">
                      {journey.frames.map((frame, col) => {
                        const story = storiesById.get(frame.story);
                        const missing = storyIndex.status === 'ready' && !story;
                        return (
                          <div key={`${frame.story}-${col}`} className="flex items-start">
                            <div className="group relative" data-frame={`${row}:${col}`}>
                              <FrameCaption
                                label={frame.label ?? story?.name ?? frame.story}
                                sub={story?.title ?? frame.story}
                                href={screenUrl(frame.story)}
                              />
                              <div
                                className={cn(
                                  'overflow-hidden rounded-[28px] border-2 shadow-lg transition-colors',
                                  missing
                                    ? 'border-error'
                                    : 'border-border-standard group-hover:border-accent',
                                  focused?.row === row && focused.col === col && 'border-accent',
                                )}
                              >
                                {missing ? (
                                  <div
                                    className="flex items-center justify-center bg-error-bg p-6 text-center text-sm text-error"
                                    style={{ width: device.width, height: device.height }}
                                  >
                                    No story “{frame.story}” — fix its id in
                                    apps/canvas/src/journeys.ts
                                  </div>
                                ) : (
                                  <StoryFrame
                                    src={screenUrl(frame.story)}
                                    title={frame.label ?? frame.story}
                                    width={device.width}
                                    height={device.height}
                                    scale={transformState.scale}
                                    interactive={iframesInteractive}
                                  />
                                )}
                              </div>
                              {frame.note && (
                                <div
                                  className="mt-3 text-sm text-text-secondary"
                                  style={{ maxWidth: device.width }}
                                >
                                  {frame.note}
                                </div>
                              )}
                            </div>
                            {col < journey.frames.length - 1 && (
                              <div
                                className="flex items-center px-4 text-text-tertiary"
                                style={{ marginTop: device.height / 2 }}
                              >
                                <div className="h-0.5 w-12 bg-border-standard" />
                                <ArrowRight className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {library.length > 0 && (
                  <section>
                    <SectionLabel title="Component library" detail={`${library.length} components`}>
                      Every story not placed on a journey above — each row is one component with all
                      its states.
                    </SectionLabel>
                    <div className="flex flex-col gap-16">
                      {library.map(({ title, count }, index) => {
                        const key = `title:${title}`;
                        const size = rowSizes[key];
                        const width = size?.width ?? count * (device.width + 32) + 48;
                        return (
                          <div
                            key={title}
                            className="group w-fit"
                            data-frame={`${JOURNEYS.length + index}:0`}
                          >
                            <FrameCaption
                              label={title}
                              sub={`${count} states`}
                              href={componentRowUrl(title, device.width)}
                            />
                            <div
                              className={cn(
                                'overflow-hidden rounded-lg border-2 border-border-standard shadow-sm group-hover:border-accent',
                                focused?.row === JOURNEYS.length + index && 'border-accent',
                              )}
                            >
                              <StoryFrame
                                src={componentRowUrl(title, device.width)}
                                title={title}
                                width={width}
                                height={size?.height ?? ROW_FALLBACK_HEIGHT}
                                scale={transformState.scale}
                                interactive={iframesInteractive}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {annotationsLoaded && (
                <AnnotationLayer
                  images={annotations.images}
                  stickies={annotations.stickies}
                  editable={ANNOTATIONS_EDITABLE}
                  spacePressed={spacePressed}
                  getScale={getScale}
                  onImagesChange={setImages}
                  onStickiesChange={setStickies}
                  onRemoveImage={removeImage}
                />
              )}
            </div>
          </TransformComponent>
        </div>
      </TransformWrapper>

      <StoriesPanel isOpen={isStoriesPanelOpen} onClose={() => setIsStoriesPanelOpen(false)} />

      {ANNOTATIONS_EDITABLE && (
        <ImageDropModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onFiles={(files) => placeFiles(files, null)}
        />
      )}

      <div className="panningDisabled wheelDisabled fixed bottom-4 right-4 z-50 flex items-center gap-3 border border-border-subtle bg-bg-elevated/90 px-3 py-2 text-xs text-text-tertiary backdrop-blur-sm">
        <span
          role="status"
          aria-live="polite"
          className={cn('font-medium text-warning', !notice && 'sr-only')}
        >
          {notice ?? ''}
        </span>
        <span hidden={Boolean(notice)}>
          {`V Select • H Pan${ANNOTATIONS_EDITABLE ? ' • S Sticky • I Image' : ''} • Scroll or middle-drag to pan • Middle-hold + scroll (or pinch) to zoom • Arrows to step through frames • ${
            iframesInteractive
              ? 'Screens are live — click into them'
              : `Zoom to ${INTERACTIVE_SCALE * 100}%+ in Select to use screens`
          }`}
        </span>
        {annotationsLoadProblem !== null ? (
          <span className="font-medium text-warning">
            {annotationsLoadProblem === 'network'
              ? 'Annotations failed to load. Reload to edit.'
              : 'Annotations file is invalid. Fix or delete apps/canvas/canvas-data/annotations.json, then reload.'}
          </span>
        ) : (
          saveState !== 'idle' && (
            <span
              role="status"
              className={cn(
                'font-medium tabular-nums',
                saveState === 'error'
                  ? 'text-warning'
                  : saveState === 'saved'
                    ? 'text-success'
                    : 'text-text-secondary',
              )}
            >
              {saveState === 'saving'
                ? 'Saving…'
                : saveState === 'saved'
                  ? 'Saved'
                  : 'Unsaved changes'}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/** Hidden renderer page whose only job is to post the story index (and re-post it on hot reload). */
function StoryIndexProbe() {
  return (
    <iframe
      src={indexUrl()}
      title="Story index"
      aria-hidden="true"
      tabIndex={-1}
      className="hidden"
    />
  );
}

function SectionLabel({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="rounded-lg border border-border-standard bg-bg-elevated px-4 py-2 text-lg font-semibold shadow-sm">
        {title}
      </div>
      <span className="text-sm text-text-tertiary">{detail}</span>
      <span className="text-sm text-text-secondary">{children}</span>
    </div>
  );
}

function FrameCaption({ label, sub, href }: { label: string; sub: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-text-primary">{label}</div>
        <div className="truncate font-mono text-xs text-text-tertiary">{sub}</div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="panningDisabled rounded-md bg-bg-secondary p-1.5 opacity-0 transition-opacity hover:bg-accent hover:text-text-on-accent group-hover:opacity-100"
        title="Open on its own"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function Flyout({
  onClose,
  className,
  children,
}: {
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          'absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-lg border border-border-standard bg-bg-elevated shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

function FlyoutItem({
  active,
  onClick,
  label,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  detail?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-bg-tertiary',
        active ? 'text-accent' : 'text-text-secondary',
      )}
    >
      <span className="flex-1">{label}</span>
      {detail && <span className="text-xs tabular-nums text-text-tertiary">{detail}</span>}
    </button>
  );
}

function ToolbarButton({
  icon: Icon,
  onClick,
  tooltip,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  tooltip: string;
  active?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={tooltip}
        className={cn(
          'rounded-md p-2.5 text-text-secondary transition-all duration-200 hover:bg-bg-tertiary hover:text-text-primary',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          active && 'bg-accent/10 text-accent',
        )}
      >
        <Icon className="h-5 w-5" />
      </button>
      {isHovered && (
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-[18px] -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2.5 text-sm text-white shadow-lg">
          {tooltip}
        </div>
      )}
    </div>
  );
}

/** Slide-over with the renderer's own index — every story, one click to open it alone. */
function StoriesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      <div
        className={cn(
          'wheelDisabled fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'wheelDisabled fixed inset-y-0 right-0 z-50 w-full max-w-md transition-transform duration-500 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-full flex-col border-l border-border-standard bg-bg-elevated shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-standard px-6 py-4">
            <div className="flex items-center gap-3">
              <LibraryBig className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">All stories</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-text-secondary hover:bg-bg-tertiary"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close panel</span>
            </button>
          </div>
          {isOpen && (
            <iframe src={indexUrl()} title="All stories" className="flex-1 border-0 bg-white" />
          )}
        </div>
      </div>
    </>
  );
}
