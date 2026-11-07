import { createHash } from 'node:crypto';
import { watch, type FSWatcher } from 'node:fs';
import { mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';

import puppeteer, { type Browser, type Page } from 'puppeteer-core';

import { shotVersionFor, type ShotVersions } from '../shot-versions';
import {
  buildStoryGraph,
  closureOf,
  impactOf,
  isGlobalFile,
  isIgnored,
  newestMtime,
  type ChangeImpact,
  type GraphRoots,
  type StoryGraph,
} from './story-deps';

/**
 * Screenshots of canvas frames, rendered in headless Chrome from the same
 * story renderer the live iframes use. The canvas shows these by default and
 * only mounts a live iframe for the frame you click, since every live frame
 * boots its own copy of the dev bundle.
 *
 * Shots are cached on disk. Each frame has its own source version (see
 * shot-versions.ts): the time of the newest change to a file its story
 * imports, directly or not (story-deps.ts). A cached shot older than that
 * version is stale. After a change, the canvas refetches only the frames
 * whose version moved, marking frames in view as `visible`, which go ahead of
 * `background` ones waiting for a page.
 */

export type ShotPriority = 'visible' | 'background';

const RENDERER_URL =
  process.env.STORY_RENDERER_URL ?? process.env.VITE_STORY_RENDERER_URL ?? 'http://localhost:8083';
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** Headless pages rendering at once. Each one boots the ~18 MB dev bundle. */
const MAX_PAGES = 4;
/** Time after fonts load for images and entering animations to settle. */
const SETTLE_MS = 1_500;
/** Largest viewport side accepted, in CSS px. */
const MAX_VIEWPORT = 8_000;
const MAX_SCALE = 3;
/** Wait after the last file event before working out which shots it affects. */
const CHANGE_DEBOUNCE_MS = 400;

export interface ShotRequest {
  /** The renderer query string, e.g. `?id=screens-home--stack&insets=50,24`. */
  query: string;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  /** A component row: the shot is cropped to the row size the renderer measured. */
  row: boolean;
}

export function parseShotRequest(params: URLSearchParams): ShotRequest | null {
  const query = params.get('q') ?? '';
  const viewportWidth = Number(params.get('vw'));
  const viewportHeight = Number(params.get('vh'));
  const scale = Number(params.get('dpr') ?? 2);
  const sizeOk = (n: number) => Number.isFinite(n) && n >= 100 && n <= MAX_VIEWPORT;
  if (!query.startsWith('?') || !sizeOk(viewportWidth) || !sizeOk(viewportHeight)) return null;
  if (!Number.isFinite(scale) || scale < 1 || scale > MAX_SCALE) return null;
  return {
    query,
    viewportWidth: Math.round(viewportWidth),
    viewportHeight: Math.round(viewportHeight),
    scale,
    row: params.get('row') === '1',
  };
}

export function createScreenshotService({
  cacheDir,
  roots,
  onStale,
}: {
  cacheDir: string;
  /** The mobile app and shared package, watched for changes. */
  roots: GraphRoots;
  /** Called after a source change moves some frame versions, with a line for the log. */
  onStale: (versions: ShotVersions, summary: string) => void;
}) {
  let graph: StoryGraph;
  /** Time of the newest change that affects every frame. */
  let globalTime = 0;
  /** Per story id, the time of the newest change that reached it. */
  const storyTimes = new Map<string, number>();
  let versions: ShotVersions = { global: 0, stories: {}, titles: {} };

  function updateVersions() {
    const stories: Record<string, number> = {};
    const titles: Record<string, number> = {};
    for (const refs of graph.storiesByFile.values()) {
      for (const { id, title } of refs) {
        const version = Math.max(globalTime, storyTimes.get(id) ?? 0);
        stories[id] = version;
        titles[title] = Math.max(titles[title] ?? 0, version);
      }
    }
    versions = { global: globalTime, stories, titles };
  }

  // On start, versions come from file mtimes, so shots cached before a restart stay fresh.
  const ready = (async () => {
    await mkdir(cacheDir, { recursive: true });
    graph = await buildStoryGraph(roots);
    globalTime = await newestMtime([...graph.files].filter((f) => isGlobalFile(graph, roots, f)));
    for (const [storyFile, refs] of graph.storiesByFile) {
      const time = await newestMtime(closureOf(graph, storyFile));
      for (const { id } of refs) storyTimes.set(id, time);
    }
    updateVersions();
  })();

  /** Changed files waiting for the debounce, and the time of the latest event. */
  const pending = new Set<string>();
  let lastEventAt = 0;
  let applying = false;
  let applyChain: Promise<void> = ready;
  let settleWaiters: Array<() => void> = [];
  let changeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Resolves once every file event so far has been applied to the versions. */
  function settled(): Promise<void> {
    if (pending.size === 0 && !applying) return ready;
    return new Promise((resolve) => settleWaiters.push(resolve));
  }

  async function applyChanges() {
    applying = true;
    const files = [...pending];
    pending.clear();
    const at = lastEventAt;
    try {
      if (files.length === 0) return;
      const changed = await Promise.all(
        files.map(async (file) => ({
          file,
          exists: (await stat(file).catch(() => null)) !== null,
        })),
      );
      const before = graph;
      graph = await buildStoryGraph(roots);
      const impact = impactOf(before, graph, roots, changed);
      if (impact.kind === 'all') globalTime = at;
      else for (const id of impact.ids) storyTimes.set(id, at);
      updateVersions();
      if (impact.kind === 'all' || impact.ids.size > 0) onStale(versions, describe(impact, files));
    } catch (error) {
      globalTime = at;
      updateVersions();
      onStale(versions, `every shot is stale (the dependency graph failed: ${String(error)})`);
    } finally {
      applying = false;
      if (pending.size === 0) {
        for (const resolve of settleWaiters) resolve();
        settleWaiters = [];
      }
    }
  }

  const watchers: FSWatcher[] = [roots.mobileDir, path.join(roots.sharedDir, 'src')].map((dir) =>
    watch(dir, { recursive: true }, (_event, file) => {
      if (!file || isIgnored(file.toString())) return;
      pending.add(path.join(dir, file.toString()));
      lastEventAt = Date.now();
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => {
        applyChain = applyChain.then(applyChanges, applyChanges);
      }, CHANGE_DEBOUNCE_MS);
    }),
  );

  let browser: Promise<Browser> | null = null;
  const idle: Page[] = [];
  let pageCount = 0;
  const waiting: Record<ShotPriority, Array<(page: Page) => void>> = {
    visible: [],
    background: [],
  };
  const nextWaiter = () => waiting.visible.shift() ?? waiting.background.shift();

  function getBrowser() {
    browser ??= puppeteer.launch({ executablePath: CHROME, headless: true }).then((b) => {
      b.on('disconnected', () => {
        browser = null;
        idle.length = 0;
        pageCount = 0;
      });
      return b;
    });
    return browser;
  }

  async function acquirePage(priority: ShotPriority): Promise<Page> {
    const page = idle.pop();
    if (page) return page;
    if (pageCount < MAX_PAGES) {
      pageCount += 1;
      try {
        // A window each: Chrome only paints the front tab of a window, and a hidden
        // tab never fires layout (component row sizes) or finishes animations.
        const created = await (await getBrowser()).newPage({ type: 'window' });
        // Match the host locale, as a live iframe in the user's browser would.
        const cdp = await created.createCDPSession();
        await cdp.send('Emulation.setLocaleOverride', {
          locale: Intl.DateTimeFormat().resolvedOptions().locale,
        });
        return created;
      } catch (error) {
        pageCount -= 1;
        throw error;
      }
    }
    return new Promise((resolve) => waiting[priority].push(resolve));
  }

  function releasePage(page: Page, broken: boolean) {
    if (broken) {
      pageCount -= 1;
      void page.close().catch(() => {});
      // A waiter would otherwise hang until another page frees up.
      const next = nextWaiter();
      if (next) void acquirePage('visible').then(next);
      return;
    }
    const next = nextWaiter();
    if (next) next(page);
    else idle.push(page);
  }

  async function render(request: ShotRequest, priority: ShotPriority): Promise<Buffer> {
    const page = await acquirePage(priority);
    let broken = false;
    try {
      await page.setViewport({
        width: request.viewportWidth,
        height: request.viewportHeight,
        deviceScaleFactor: request.scale,
      });
      await page.goto(`${RENDERER_URL}/${request.query}`, { waitUntil: 'load', timeout: 60_000 });
      // Expo's Fast Refresh badge (bottom left, dev only) shows if Metro pushes a
      // hot update while the shot is taken. Live frames still show it.
      await page.addStyleTag({ content: '.__expo_fast_refresh { display: none !important; }' });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      let clip: { x: number; y: number; width: number; height: number } | undefined;
      if (request.row) {
        await page.waitForFunction(() => '__canvasRowSize' in window, { timeout: 15_000 });
      }
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
      if (request.row) {
        const size = await page.evaluate(
          () => (window as { __canvasRowSize?: { width: number; height: number } }).__canvasRowSize,
        );
        if (size)
          clip = { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height) };
      }
      return Buffer.from(
        await page.screenshot({ type: 'webp', quality: 90, clip, captureBeyondViewport: !!clip }),
      );
    } catch (error) {
      broken = true;
      throw error;
    } finally {
      releasePage(page, broken);
    }
  }

  const inflight = new Map<string, Promise<Buffer>>();

  /** A shot taken after the latest change affecting it, from the disk cache or freshly rendered. */
  async function get(request: ShotRequest, priority: ShotPriority = 'visible'): Promise<Buffer> {
    await settled();
    const version = shotVersionFor(versions, request.query);
    const key = createHash('sha1')
      .update(
        `${request.query}|${request.viewportWidth}x${request.viewportHeight}@${request.scale}|${request.row}`,
      )
      .digest('hex');
    const file = path.join(cacheDir, `${key}.webp`);
    const cached = await stat(file).catch(() => null);
    if (cached && cached.mtimeMs > version) return readFile(file);

    // A render that started before the latest change would hand back an old picture.
    const jobKey = `${key}@${version}`;
    const pending = inflight.get(jobKey);
    if (pending) return pending;
    const startedAt = Date.now();
    const job = render(request, priority)
      .then(async (image) => {
        await writeFile(file, image);
        // A change during the render leaves the file older than the version, so it re-renders.
        await settled();
        if (shotVersionFor(versions, request.query) >= startedAt) {
          await utimes(file, new Date(startedAt - 1), new Date(startedAt - 1));
        }
        return image;
      })
      .finally(() => inflight.delete(jobKey));
    inflight.set(jobKey, job);
    return job;
  }

  async function close() {
    clearTimeout(changeTimer);
    for (const watcher of watchers) watcher.close();
    const b = await browser?.catch(() => null);
    await b?.close().catch(() => {});
  }

  return { get, close, versions: async () => (await settled(), versions) };
}

function describe(impact: ChangeImpact, files: string[]) {
  const names = files.map((file) => path.basename(file)).join(', ');
  return impact.kind === 'all'
    ? `${names}: every shot is stale (${impact.reason})`
    : `${names}: ${impact.ids.size} ${impact.ids.size === 1 ? 'story is' : 'stories are'} stale`;
}
