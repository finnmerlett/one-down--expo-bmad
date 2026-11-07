// `bun run canvas` — the design canvas and the story renderer its frames
// frame, as one command: Metro's web target on :8083 (apps/mobile
// storybook:web) + the Vite canvas on :8084 (apps/canvas). Ctrl-C stops both.
// Either server already running (e.g. a separate `bun run storybook:web`)
// is reused rather than started twice.
import { spawn, type Subprocess } from 'bun';

const RENDERER_PORT = 8083;
const CANVAS_PORT = 8084;

async function isListening(port: number): Promise<boolean> {
  try {
    await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1_000) });
    return true;
  } catch {
    return false;
  }
}

const children: Subprocess[] = [];

function start(label: string, cmd: string[], cwd: string) {
  console.log(`▶ ${label}: ${cmd.join(' ')}`);
  children.push(
    spawn({
      cmd,
      cwd,
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, BROWSER: 'none' },
    }),
  );
}

const root = new URL('..', import.meta.url).pathname;

if (await isListening(RENDERER_PORT))
  console.log(`✓ story renderer already running on :${RENDERER_PORT}`);
else start('story renderer', ['bun', 'run', 'storybook:web'], `${root}apps/mobile`);

if (await isListening(CANVAS_PORT)) console.log(`✓ canvas already running on :${CANVAS_PORT}`);
else start('canvas', ['bun', 'run', 'dev'], `${root}apps/canvas`);

console.log(
  `\nCanvas: http://localhost:${CANVAS_PORT}  (frames appear once Metro finishes its first web bundle)\n`,
);

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await Promise.all(children.map((child) => child.exited));
