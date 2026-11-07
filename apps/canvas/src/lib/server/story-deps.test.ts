import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JOURNEYS } from '@/journeys';
import { shotVersionFor } from '@/lib/shot-versions';

import { buildStoryGraph, impactOf, type GraphRoots, type StoryGraph } from './story-deps';

let roots: GraphRoots;

async function write(relative: string, content: string) {
  const file = path.join(path.dirname(roots.mobileDir), relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

const mobile = (relative: string) => path.join(roots.mobileDir, relative);
const shared = (relative: string) => path.join(roots.sharedDir, relative);

function ids(graph: StoryGraph, ...files: string[]) {
  const impact = impactOf(
    graph,
    graph,
    roots,
    files.map((file) => ({ file, exists: true })),
  );
  return impact.kind === 'all' ? 'all' : [...impact.ids].sort();
}

const story = (title: string, imports: string, ...exports: string[]) =>
  `${imports}\nconst meta = { title: '${title}' } satisfies Meta;\nexport default meta;\n${exports
    .map((name) => `export const ${name}: Story = {};`)
    .join('\n')}\n`;

/**
 * A small app: two components sharing a button, a screen that renders one of
 * them, and a story renderer whose preview wraps every story in a provider.
 */
beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'story-deps-'));
  roots = { mobileDir: path.join(dir, 'mobile'), sharedDir: path.join(dir, 'shared') };
  await write(
    'shared/package.json',
    JSON.stringify({ exports: { '.': './src/index.ts', './schema': './src/schema/index.ts' } }),
  );
  await write('shared/src/index.ts', `export * from './stars';\n`);
  await write('shared/src/stars.ts', `export const STARS = 3;\n`);
  await write('shared/src/schema/index.ts', `export const tasks = {};\n`);

  await write('mobile/.rnstorybook/preview.tsx', `import '../src/components/ui/provider';\n`);
  await write('mobile/src/components/ui/provider/index.tsx', `export const Provider = 1;\n`);
  await write('mobile/src/global.css', `@tailwind base;\n`);
  await write('mobile/src/components/ui/button.tsx', `export const Button = 1;\n`);
  await write('mobile/src/components/ui/button.web.tsx', `export const Button = 2;\n`);
  await write('mobile/src/lib/types.ts', `export type Task = { id: string };\n`);
  await write('mobile/src/lib/format.ts', `export const format = (n: number) => String(n);\n`);
  await write('mobile/src/lib/stars.ts', `import { STARS } from '@one-down/shared';\n`);
  await write(
    'mobile/src/components/card/task-card.tsx',
    [
      `import type { Task } from '@/lib/types';`,
      `import { Button } from '../ui/button';`,
      `import { format } from '@/lib/format';`,
      `import { View } from 'react-native';`,
    ].join('\n'),
  );
  await write(
    'mobile/src/components/card/task-card.stories.tsx',
    story(
      'card-stack/TaskCard',
      `import { TaskCard } from './task-card';`,
      'Default',
      'WithDeadline',
      'makeTask',
    ),
  );
  await write(
    'mobile/src/components/list/task-row.tsx',
    `export { Button } from '@/components/ui/button';\nexport * from '@/lib/stars';\n`,
  );
  await write(
    'mobile/src/components/list/task-row.stories.tsx',
    story('task-list/TaskRow', `import { TaskRow } from './task-row';`, 'Plain'),
  );
  await write(
    'mobile/src/components/home/home-screen.tsx',
    `import { TaskCard } from '@/components/card/task-card';\nexport * from '@one-down/shared/schema';\n`,
  );
  await write(
    'mobile/src/components/home/home-screen.stories.tsx',
    story('screens/Home', `import { HomeScreen } from './home-screen';`, 'Stack', 'QuickAdd'),
  );
  await write('mobile/src/app/index.tsx', `import { format } from '@/lib/format';\n`);
});

afterEach(async () => {
  await fs.rm(path.dirname(roots.mobileDir), { recursive: true, force: true });
});

describe('buildStoryGraph', () => {
  it('gives story ids as Storybook builds them, skipping lowercase helper exports', async () => {
    const graph = await buildStoryGraph(roots);
    expect(graph.storiesByFile.get(mobile('src/components/home/home-screen.stories.tsx'))).toEqual([
      { id: 'screens-home--stack', title: 'screens/Home' },
      { id: 'screens-home--quick-add', title: 'screens/Home' },
    ]);
    expect(
      graph.storiesByFile
        .get(mobile('src/components/card/task-card.stories.tsx'))
        ?.map((s) => s.id),
    ).toEqual(['card-stack-taskcard--default', 'card-stack-taskcard--with-deadline']);
  });

  it('uses the meta id over the title when a story file sets one', async () => {
    await write(
      'mobile/src/components/list/task-row.stories.tsx',
      `export default { title: 'task-list/TaskRow', id: 'rows' };\nexport const Plain = {};\n`,
    );
    const graph = await buildStoryGraph(roots);
    expect(graph.storiesByFile.get(mobile('src/components/list/task-row.stories.tsx'))).toEqual([
      { id: 'rows--plain', title: 'task-list/TaskRow' },
    ]);
  });

  it('follows relative imports, the @/ alias, re-exports and @one-down/shared subpaths', async () => {
    const graph = await buildStoryGraph(roots);
    expect([...(graph.imports.get(mobile('src/components/home/home-screen.tsx')) ?? [])]).toEqual([
      mobile('src/components/card/task-card.tsx'),
      shared('src/schema/index.ts'),
    ]);
    expect([...(graph.imports.get(mobile('src/components/list/task-row.tsx')) ?? [])]).toEqual([
      mobile('src/components/ui/button.web.tsx'),
      mobile('src/lib/stars.ts'),
    ]);
    expect(graph.imports.get(shared('src/index.ts'))).toEqual(new Set([shared('src/stars.ts')]));
  });

  it('prefers the .web file, as Metro does for the web target', async () => {
    const graph = await buildStoryGraph(roots);
    expect(graph.imports.has(mobile('src/components/ui/button.web.tsx'))).toBe(true);
    expect(graph.imports.has(mobile('src/components/ui/button.tsx'))).toBe(false);
  });

  it('skips type-only imports and packages', async () => {
    const graph = await buildStoryGraph(roots);
    expect(graph.imports.has(mobile('src/lib/types.ts'))).toBe(false);
    expect(graph.unresolved).toEqual([]);
  });

  it('follows require() and import() with a literal path', async () => {
    await write(
      'mobile/src/components/list/task-row.tsx',
      `const icon = require('../../lib/format');\nconst lazy = () => import('@/lib/types');\n`,
    );
    const graph = await buildStoryGraph(roots);
    expect(graph.imports.get(mobile('src/components/list/task-row.tsx'))).toEqual(
      new Set([mobile('src/lib/format.ts'), mobile('src/lib/types.ts')]),
    );
  });

  it('lists local imports that resolve to no file', async () => {
    await write('mobile/src/components/list/task-row.tsx', `import { x } from '@/lib/missing';\n`);
    const graph = await buildStoryGraph(roots);
    expect(graph.unresolved).toEqual([
      { from: mobile('src/components/list/task-row.tsx'), specifier: '@/lib/missing' },
    ]);
  });

  it('counts files the story renderer reaches as global', async () => {
    const graph = await buildStoryGraph(roots);
    expect(graph.globalFiles).toEqual(
      new Set([mobile('.rnstorybook/preview.tsx'), mobile('src/components/ui/provider/index.tsx')]),
    );
  });
});

describe('impactOf', () => {
  it('maps a component to the stories that import it, directly or through a screen', async () => {
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile('src/components/card/task-card.tsx'))).toEqual([
      'card-stack-taskcard--default',
      'card-stack-taskcard--with-deadline',
      'screens-home--quick-add',
      'screens-home--stack',
    ]);
  });

  it('maps a shared file to the stories that reach it through @one-down/shared', async () => {
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, shared('src/stars.ts'))).toEqual(['task-list-taskrow--plain']);
  });

  it('maps a story file to its own stories', async () => {
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile('src/components/list/task-row.stories.tsx'))).toEqual([
      'task-list-taskrow--plain',
    ]);
  });

  it('affects nothing for code no story reaches', async () => {
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile('src/app/index.tsx'))).toEqual([]);
    expect(ids(graph, mobile('src/lib/types.ts'))).toEqual([]);
  });

  it.each([
    'src/global.css',
    'tailwind.config.js',
    'babel.config.js',
    'metro.config.js',
    'package.json',
    '.rnstorybook/web-shims/keyboard.ts',
    'src/components/ui/provider/index.tsx',
    'src/components/ui/gluestack-ui-provider/config.ts',
  ])('refreshes every frame when %s changes', async (relative) => {
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile(relative))).toBe('all');
  });

  it('refreshes every frame for a file that is not code and no story reaches', async () => {
    await write('mobile/assets/images/logo.png', 'png');
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile('assets/images/logo.png'))).toBe('all');
  });

  it('ignores a deleted file that was never in the graph, like an editor temp file', async () => {
    const graph = await buildStoryGraph(roots);
    const impact = impactOf(graph, graph, roots, [
      { file: mobile('src/components/card/.task-card.tsx.swp'), exists: false },
    ]);
    expect(impact).toEqual({ kind: 'stories', ids: new Set() });
  });

  it('counts an import both before and after the change', async () => {
    const before = await buildStoryGraph(roots);
    // The screen stops rendering the card and starts using format directly.
    await write(
      'mobile/src/components/home/home-screen.tsx',
      `import { format } from '@/lib/format';\n`,
    );
    const after = await buildStoryGraph(roots);
    const impact = impactOf(before, after, roots, [
      { file: mobile('src/components/home/home-screen.tsx'), exists: true },
    ]);
    expect(impact).toEqual({
      kind: 'stories',
      ids: new Set(['screens-home--stack', 'screens-home--quick-add']),
    });
    // A later edit to the card no longer reaches the screen.
    expect(ids(after, mobile('src/components/card/task-card.tsx'))).toEqual([
      'card-stack-taskcard--default',
      'card-stack-taskcard--with-deadline',
    ]);
  });

  it('refreshes every frame when a story file has no title, since its ids are unknown', async () => {
    await write(
      'mobile/src/components/list/task-row.stories.tsx',
      `import { TaskRow } from './task-row';\nexport default {};\nexport const Plain = {};\n`,
    );
    const graph = await buildStoryGraph(roots);
    expect(ids(graph, mobile('src/lib/stars.ts'))).toBe('all');
  });
});

describe('shotVersionFor', () => {
  const versions = {
    global: 10,
    stories: { 'screens-home--stack': 30, 'screens-home--quick-add': 10 },
    titles: { 'screens/Home': 30 },
  };

  it('reads a story frame, a component row and the global fallback', () => {
    expect(shotVersionFor(versions, '?id=screens-home--stack&insets=50,24')).toBe(30);
    expect(shotVersionFor(versions, '?title=screens%2FHome&w=412')).toBe(30);
    expect(shotVersionFor(versions, '?id=unknown--story')).toBe(10);
    expect(shotVersionFor(versions, '?title=unknown')).toBe(10);
  });
});

describe('the real app', () => {
  const canvasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

  it('finds every story the journeys place, with no unresolved local imports', async () => {
    const graph = await buildStoryGraph({
      mobileDir: path.join(canvasDir, '../mobile'),
      sharedDir: path.join(canvasDir, '../../packages/shared'),
    });
    const known = new Set([...graph.storiesByFile.values()].flat().map((s) => s.id));
    const placed = JOURNEYS.flatMap((journey) => journey.frames.map((frame) => frame.story));
    expect(placed.filter((id) => !known.has(id))).toEqual([]);
    expect(graph.unresolved).toEqual([]);
  });
});
