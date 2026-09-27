// Canvas-vs-device fidelity check: renders each story on an Android device
// (the dev build's single-story mode, .rnstorybook/root.tsx) and in the web
// renderer at the device's exact dp size and insets (what a canvas frame
// shows), then pixel-diffs the two.
//
//   bun run diff [story-id[:keyboard] …]     (default: DIFF_TARGETS below)
//
// Needs: the device/emulator running the dev build against a Storybook Metro
// (see apps/canvas/README.md), the web renderer on :8083, and Google Chrome.
// `:keyboard` taps the story's first text field on the device (raising the
// real keyboard) and uses the renderer's mock keyboard on web; the keyboard
// area itself is masked out of the diff, like the system bars.
//
// Output: diff-output/<run>/<story>.png — device | web | diff side by side —
// plus summary.json. A mismatch below ~1% is antialiasing-level noise.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import pixelmatch from 'pixelmatch';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const SERIAL = process.env.ANDROID_SERIAL ?? 'emulator-5554';
const PACKAGE = process.env.DEV_PACKAGE ?? 'com.onedown.mobile.dev';
const RENDERER_URL = process.env.STORY_RENDERER_URL ?? 'http://localhost:8083';
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** Story settle time once mounted: fonts, images, entering animations. */
const SETTLE_MS = 2500;
/** How long a deep link may take to land (the emulator lags under load). */
const MOUNT_TIMEOUT_MS = 30_000;
/** Diffed at half device resolution — detail enough, and forgiving of subpixel AA. */
const DIFF_SCALE = 0.5;

/** The pilot set; pass ids on the command line to diff others. */
const DIFF_TARGETS = [
  'screens-home--stack',
  'screens-home--empty',
  'screens-home--all-clear',
  'screens-home--filtered-out',
  'screens-home--right-now-sheet',
  'screens-home--card-back-open',
  'screens-home--quick-add:keyboard',
  'screens-home--triage-waiting',
  'screens-home--avoided-task-nudge',
  'screens-tasklist--active',
  'screens-tasklist--empty',
  'screens-tasklist--multi-select',
  'screens-tasklist--archive-warning',
  'screens-tasklist--recycle-bin',
  'screens-tasklist--delete-confirm',
  'screens-tasklist--empty-bin',
];

const adb = (...args: string[]) =>
  execFileSync('adb', ['-s', SERIAL, ...args], { maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface DeviceMetrics {
  widthPx: number;
  heightPx: number;
  scale: number;
  statusBarPx: number;
  navBarPx: number;
}

function readDeviceMetrics(): DeviceMetrics {
  const size = adb('shell', 'wm', 'size')
    .toString()
    .match(/(\d+)x(\d+)/);
  const density = adb('shell', 'wm', 'density')
    .toString()
    .match(/(\d+)\s*$/m);
  const windows = adb('shell', 'dumpsys', 'window').toString();
  const bar = (type: string) => {
    const frame = windows.match(
      new RegExp(`type=${type} frame=\\[\\d+,(\\d+)\\]\\[\\d+,(\\d+)\\]`),
    );
    return frame ? Number(frame[2]) - Number(frame[1]) : 0;
  };
  if (!size || !density)
    throw new Error(`Could not read size/density from ${SERIAL} — is it booted?`);
  return {
    widthPx: Number(size[1]),
    heightPx: Number(size[2]),
    scale: Number(density[1]) / 160,
    statusBarPx: bar('statusBars'),
    navBarPx: bar('navigationBars'),
  };
}

/**
 * Top edge (px) of the on-screen keyboard once it is actually showing — null
 * if it never opens. (The IME's insets *hint* is reported even while hidden,
 * so only a visible frame counts.)
 */
async function keyboardTopPx(): Promise<number | null> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const visible = adb('shell', 'dumpsys', 'window')
      .toString()
      .match(/type=ime frame=\[\d+,(\d+)\]\[\d+,\d+\][^\n]*visible=true/);
    if (visible && Number(visible[1]) > 0) return Number(visible[1]);
    await sleep(250);
  }
  return null;
}

/** Device locale and timezone, so web dates and numbers format the same. */
function readDeviceLocale(): { locale: string; timezone: string } {
  const prop = (name: string) => adb('shell', 'getprop', name).toString().trim();
  return {
    locale: prop('persist.sys.locale') || prop('ro.product.locale') || 'en-US',
    timezone: prop('persist.sys.timezone') || 'UTC',
  };
}

type Point = { x: number; y: number };

/**
 * Where to tap to start typing: the first text field, from uiautomator —
 * or, when it can't dump (it never sees an idle screen while something
 * animates), from the web render, whose layout matches the device's.
 */
function firstFieldCentre(fallback: Point | null): Point | null {
  try {
    adb('shell', 'uiautomator', 'dump', '/sdcard/canvas-diff.xml');
    const xml = adb('shell', 'cat', '/sdcard/canvas-diff.xml').toString();
    const field = xml.match(
      /class="android\.widget\.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/,
    );
    if (field) {
      const [x1, y1, x2, y2] = field.slice(1).map(Number) as [number, number, number, number];
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }
  } catch {
    // no idle state — fall through to the web-derived point
  }
  return fallback;
}

/** Wait until the story opened with this nonce has rendered (root.tsx logs it). */
async function waitForStory(nonce: string) {
  const deadline = Date.now() + MOUNT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const log = adb('logcat', '-d', '-s', 'ReactNativeJS:I').toString();
    if (log.includes(`canvas-story-mounted ${nonce}`)) return;
    await sleep(300);
  }
  throw new Error(`story with nonce ${nonce} never rendered on ${SERIAL}`);
}

function imeVisible(): boolean {
  return /type=ime frame=\[[^\n]*visible=true/.test(adb('shell', 'dumpsys', 'window').toString());
}

/**
 * Close a keyboard left up by the previous story: a story mounted under a
 * closing keyboard pads for it (KeyboardAvoidingView) and captures shifted.
 * With the keyboard up, BACK only dismisses the keyboard — it can't close a
 * modal the way it would otherwise.
 */
async function dismissKeyboard() {
  if (!imeVisible()) return;
  adb('shell', 'input', 'keyevent', '4');
  const deadline = Date.now() + 5_000;
  while (imeVisible() && Date.now() < deadline) await sleep(200);
}

async function captureDevice(
  storyId: string,
  keyboard: boolean,
  metrics: DeviceMetrics,
  webField: Point | null,
) {
  await dismissKeyboard();
  const nonce = String(Date.now());
  adb('logcat', '-c');
  // The nonce remounts the story even when it is already showing (and the
  // unmount drops any keyboard left up). No ESC: Android treats it as BACK,
  // which closes modals.
  adb(
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `"onedown://story?id=${storyId}&n=${nonce}"`,
    PACKAGE,
  );
  await waitForStory(nonce);
  await sleep(SETTLE_MS);
  let keyboardTop: number | null = null;
  if (keyboard) {
    const field = firstFieldCentre(webField);
    if (field)
      adb('shell', 'input', 'tap', String(Math.round(field.x)), String(Math.round(field.y)));
    // oxlint-disable-next-line no-console
    else console.warn(`  ${storyId}: no text field to focus on the device`);
    keyboardTop = await keyboardTopPx();
    // oxlint-disable-next-line no-console
    if (keyboardTop === null) console.warn(`  ${storyId}: the device keyboard never opened`);
    await sleep(800); // the story's own keyboard padding animates in
  }
  return { png: adb('exec-out', 'screencap', '-p'), keyboardTop };
}

async function captureWeb(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  storyId: string,
  keyboard: boolean,
  metrics: DeviceMetrics,
  { locale, timezone }: { locale: string; timezone: string },
) {
  const page = await browser.newPage();
  await page.emulateTimezone(timezone);
  // --lang alone does not reach Intl in headless Chrome; the CDP override does.
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setLocaleOverride', { locale });
  await page.setViewport({
    width: Math.round(metrics.widthPx / metrics.scale),
    height: Math.round(metrics.heightPx / metrics.scale),
    deviceScaleFactor: metrics.scale,
  });
  const insets = `${metrics.statusBarPx / metrics.scale},${metrics.navBarPx / metrics.scale}`;
  const url = `${RENDERER_URL}/?id=${encodeURIComponent(storyId)}&insets=${insets}${keyboard ? '&keyboard=1' : ''}`;
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(SETTLE_MS);
  const png = Buffer.from(await page.screenshot({ type: 'png' }));
  await page.close();
  return png;
}

/** The first text field's centre in device px, from a keyboard-less web render. */
async function webFieldCentre(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  storyId: string,
  metrics: DeviceMetrics,
): Promise<Point | null> {
  const page = await browser.newPage();
  await page.setViewport({
    width: Math.round(metrics.widthPx / metrics.scale),
    height: Math.round(metrics.heightPx / metrics.scale),
    deviceScaleFactor: metrics.scale,
  });
  const insets = `${metrics.statusBarPx / metrics.scale},${metrics.navBarPx / metrics.scale}`;
  await page.goto(`${RENDERER_URL}/?id=${encodeURIComponent(storyId)}&insets=${insets}`, {
    waitUntil: 'load',
  });
  await sleep(SETTLE_MS);
  const rect = await page.evaluate(() => {
    const field = document.querySelector('input, textarea');
    const box = field?.getBoundingClientRect();
    return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
  });
  await page.close();
  return rect ? { x: rect.x * metrics.scale, y: rect.y * metrics.scale } : null;
}

/** Both captures at the same diff resolution, as raw RGBA. */
async function toRaw(png: Buffer, width: number, height: number) {
  return sharp(png).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
}

async function main() {
  const targets = (process.argv.length > 2 ? process.argv.slice(2) : DIFF_TARGETS).map((arg) => {
    const [id = '', flag] = arg.split(':');
    return { id, keyboard: flag === 'keyboard' };
  });
  const metrics = readDeviceMetrics();
  const width = Math.round(metrics.widthPx * DIFF_SCALE);
  const height = Math.round(metrics.heightPx * DIFF_SCALE);
  const run = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(import.meta.dirname, '..', 'diff-output', run);
  mkdirSync(outDir, { recursive: true });
  // oxlint-disable-next-line no-console
  console.log(
    `device ${SERIAL}: ${metrics.widthPx}×${metrics.heightPx}px @${metrics.scale}x, ` +
      `bars ${metrics.statusBarPx}/${metrics.navBarPx}px → ${outDir}`,
  );

  const { locale, timezone } = readDeviceLocale();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [`--lang=${locale}`],
    env: { ...process.env, LANG: `${locale.replace('-', '_')}.UTF-8` },
  });
  const summary: Array<{ story: string; mismatchPct: number; file: string }> = [];
  try {
    for (const { id, keyboard } of targets) {
      const webField = keyboard ? await webFieldCentre(browser, id, metrics) : null;
      const device = await captureDevice(id, keyboard, metrics, webField);
      const web = await captureWeb(browser, id, keyboard, metrics, { locale, timezone });
      const [a, b] = await Promise.all([
        toRaw(device.png, width, height),
        toRaw(web, width, height),
      ]);

      // Masked rows (system bars, keyboard) are copied device → web so they never count.
      const maskedRows = new Set<number>();
      const maskPx = (fromPx: number, toPx: number) => {
        for (let y = Math.floor(fromPx * DIFF_SCALE); y < Math.ceil(toPx * DIFF_SCALE); y++)
          maskedRows.add(y);
      };
      maskPx(0, metrics.statusBarPx);
      maskPx(metrics.heightPx - metrics.navBarPx, metrics.heightPx);
      if (keyboard) maskPx(device.keyboardTop ?? metrics.heightPx, metrics.heightPx);
      for (const y of maskedRows) a.copy(b, y * width * 4, y * width * 4, (y + 1) * width * 4);

      const diff = Buffer.alloc(width * height * 4);
      const changed = pixelmatch(a, b, diff, width, height, { threshold: 0.15, includeAA: false });
      const counted = width * (height - maskedRows.size);
      const mismatchPct = Math.round((changed / counted) * 10_000) / 100;

      const raw = { raw: { width, height, channels: 4 as const } };
      const file = path.join(outDir, `${id}${keyboard ? '--keyboard' : ''}.png`);
      await sharp({ create: { width: width * 3 + 32, height, channels: 4, background: '#808080' } })
        .composite([
          { input: a, ...raw, left: 0, top: 0 },
          { input: b, ...raw, left: width + 16, top: 0 },
          { input: diff, ...raw, left: width * 2 + 32, top: 0 },
        ])
        .png()
        .toFile(file);
      summary.push({ story: id + (keyboard ? ':keyboard' : ''), mismatchPct, file });
      // oxlint-disable-next-line no-console
      console.log(
        `  ${mismatchPct.toFixed(2).padStart(6)}%  ${id}${keyboard ? ' (keyboard' + (device.keyboardTop ? ` top ${device.keyboardTop}px` : ', no IME frame') + ')' : ''}`,
      );
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}

await main();
