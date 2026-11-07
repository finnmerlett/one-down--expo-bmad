import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { storyNameFromExport, toId } from 'storybook/internal/csf';
import ts from 'typescript';

/**
 * Works out which canvas frames a source change affects. The graph follows
 * static imports from every story file and from the story renderer itself
 * (`.rnstorybook/`), resolving them the way Metro's web target does: relative
 * paths, the `@/` alias for `apps/mobile/src`, and `@one-down/shared` into
 * `packages/shared/src`. Package imports are skipped, since a change there
 * means a reinstall and a Metro restart.
 */

/** A story as the renderer indexes it (see `.rnstorybook/story-registry.ts`). */
export interface StoryRef {
  id: string;
  title: string;
}

export interface StoryGraph {
  /** Every file under the watched trees, ignored directories aside. */
  files: Set<string>;
  /** Stories in each story file. Empty when the file has no `title`, so its ids are unknown. */
  storiesByFile: Map<string, StoryRef[]>;
  /** Every file the walk reached, with the files it imports. */
  imports: Map<string, Set<string>>;
  /** The reverse of `imports`. */
  importedBy: Map<string, Set<string>>;
  /** Files the story renderer reaches, so every frame depends on them. */
  globalFiles: Set<string>;
  /** Local imports (relative, `@/`, `@one-down/shared`) that don't resolve to a file. */
  unresolved: Array<{ from: string; specifier: string }>;
}

export interface GraphRoots {
  /** `apps/mobile`. */
  mobileDir: string;
  /** `packages/shared`. */
  sharedDir: string;
}

/** Directories under the mobile app that never affect a rendered story. */
export const IGNORED_DIRS = new Set([
  'node_modules',
  'android',
  'ios',
  '.expo',
  'dist',
  'coverage',
]);
/** Rewritten by Metro on every start; story changes show up in the story files themselves. */
export const IGNORED_FILES = new Set(['storybook.requires.ts', '.DS_Store']);

/** Metro's web resolution order: `.web.<ext>` before `.<ext>`, extension by extension. */
const EXTENSIONS = ['tsx', 'ts', 'jsx', 'js', 'mjs', 'cjs', 'json', 'sql'];
const CODE_FILE = /\.(tsx?|jsx?|mjs|cjs)$/;
const STORY_FILE = /\.stories\.tsx$/;

/**
 * Files outside the import graph that change how every story renders, relative
 * to `apps/mobile`. Directories end with `/`.
 */
const GLOBAL_PATHS = [
  '.rnstorybook/',
  'src/global.css',
  'src/components/ui/gluestack-ui-provider/',
  'src/constants/typography.ts',
  'src/constants/fonts.ts',
  'tailwind.config.js',
  'nativewind-env.d.ts',
  'babel.config.js',
  'metro.config.js',
  'package.json',
  'tsconfig.json',
  'app.json',
  'app.config.js',
];

export function isIgnored(relative: string) {
  const parts = relative.split(path.sep);
  return (
    IGNORED_FILES.has(parts.at(-1) ?? '') ||
    parts.some((part) => IGNORED_DIRS.has(part) || part.startsWith('.git'))
  );
}

export async function buildStoryGraph(roots: GraphRoots): Promise<StoryGraph> {
  const sharedSrc = path.join(roots.sharedDir, 'src');
  const files = new Set([...(await listFiles(roots.mobileDir)), ...(await listFiles(sharedSrc))]);
  const sharedExports = await readSharedExports(roots.sharedDir);

  const resolveFile = (base: string): string | null => {
    if (files.has(base)) return base;
    for (const candidate of [base, path.join(base, 'index')]) {
      for (const ext of EXTENSIONS) {
        if (files.has(`${candidate}.web.${ext}`)) return `${candidate}.web.${ext}`;
        if (files.has(`${candidate}.${ext}`)) return `${candidate}.${ext}`;
      }
    }
    return null;
  };

  /** A file path, `null` for a local import that doesn't resolve, or `undefined` for a package. */
  const resolve = (from: string, specifier: string): string | null | undefined => {
    if (specifier.startsWith('.')) return resolveFile(path.resolve(path.dirname(from), specifier));
    if (specifier.startsWith('@/assets/'))
      return resolveFile(path.join(roots.mobileDir, 'assets', specifier.slice('@/assets/'.length)));
    if (specifier.startsWith('@/'))
      return resolveFile(path.join(roots.mobileDir, 'src', specifier.slice(2)));
    if (specifier === '@one-down/shared' || specifier.startsWith('@one-down/shared/')) {
      const target = sharedExports[`.${specifier.slice('@one-down/shared'.length)}`];
      return target ? resolveFile(path.join(roots.sharedDir, target)) : null;
    }
    return undefined;
  };

  const graph: StoryGraph = {
    files,
    storiesByFile: new Map(),
    imports: new Map(),
    importedBy: new Map(),
    globalFiles: new Set(),
    unresolved: [],
  };

  async function walk(entry: string, reached?: Set<string>) {
    const stack = [entry];
    while (stack.length > 0) {
      const file = stack.pop()!;
      if (reached?.has(file)) continue;
      reached?.add(file);
      if (graph.imports.has(file)) {
        // Already parsed from another root; still record it as reached.
        if (reached) stack.push(...(graph.imports.get(file) ?? []));
        continue;
      }
      const deps = new Set<string>();
      graph.imports.set(file, deps);
      if (!CODE_FILE.test(file)) continue;
      const source = ts.createSourceFile(
        file,
        // A file deleted mid-walk counts as empty; the next change rebuilds the graph.
        await readFile(file, 'utf8').catch(() => ''),
        ts.ScriptTarget.Latest,
        false,
      );
      if (STORY_FILE.test(file)) graph.storiesByFile.set(file, storiesIn(source));
      for (const specifier of importSpecifiers(source)) {
        const target = resolve(file, specifier);
        if (target === undefined) continue;
        if (target === null) {
          graph.unresolved.push({ from: file, specifier });
          continue;
        }
        deps.add(target);
        let importers = graph.importedBy.get(target);
        if (!importers) graph.importedBy.set(target, (importers = new Set()));
        importers.add(file);
        stack.push(target);
      }
    }
  }

  const rendererDir = path.join(roots.mobileDir, '.rnstorybook');
  for (const file of files) {
    if (file.startsWith(rendererDir + path.sep) && CODE_FILE.test(file)) {
      await walk(file, graph.globalFiles);
    }
  }
  for (const file of files) {
    if (STORY_FILE.test(file) && file.startsWith(path.join(roots.mobileDir, 'src') + path.sep)) {
      await walk(file);
    }
  }
  return graph;
}

/** Whether a change to `file` (absolute) should refresh every frame regardless of the graph. */
export function isGlobalFile(graph: StoryGraph, roots: GraphRoots, file: string) {
  if (graph.globalFiles.has(file)) return true;
  const relative = path.relative(roots.mobileDir, file).split(path.sep).join('/');
  return GLOBAL_PATHS.some((entry) =>
    entry.endsWith('/') ? relative.startsWith(entry) : relative === entry,
  );
}

/** Story files whose imports reach `file`, including `file` itself if it's a story file. */
export function storyFilesReaching(graph: StoryGraph, file: string): Set<string> {
  const found = new Set<string>();
  const seen = new Set<string>();
  const stack = [file];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    if (graph.storiesByFile.has(current)) found.add(current);
    stack.push(...(graph.importedBy.get(current) ?? []));
  }
  return found;
}

/** Every file a story file reaches, itself included. */
export function closureOf(graph: StoryGraph, file: string): Set<string> {
  const seen = new Set<string>();
  const stack = [file];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.imports.get(current) ?? []));
  }
  return seen;
}

export type ChangeImpact = { kind: 'all'; reason: string } | { kind: 'stories'; ids: Set<string> };

/**
 * The stories a batch of changed files affects. `before` is the graph from
 * before the change and `after` is rebuilt from the files as they are now, so
 * an import that was removed and one that was added both count.
 *
 * A changed file refreshes every frame if it's global, if it's reached from a
 * story file without a `title`, or if it isn't code and no story reaches it
 * (an image or JSON file the walk can't place). A code file no story reaches
 * affects nothing, and neither does a file that no longer exists and wasn't
 * in the graph, such as an editor's temporary file.
 */
export function impactOf(
  before: StoryGraph,
  after: StoryGraph,
  roots: GraphRoots,
  changed: Array<{ file: string; exists: boolean }>,
): ChangeImpact {
  const ids = new Set<string>();
  for (const { file, exists } of changed) {
    if (isGlobalFile(before, roots, file) || isGlobalFile(after, roots, file)) {
      return { kind: 'all', reason: path.relative(roots.mobileDir, file) };
    }
    const storyFiles = new Set([
      ...storyFilesReaching(before, file),
      ...storyFilesReaching(after, file),
    ]);
    if (storyFiles.size === 0) {
      if (!exists || CODE_FILE.test(file)) continue;
      return { kind: 'all', reason: `${path.relative(roots.mobileDir, file)} (not in the graph)` };
    }
    for (const storyFile of storyFiles) {
      const stories = after.storiesByFile.get(storyFile) ?? before.storiesByFile.get(storyFile);
      if (!stories || stories.length === 0) {
        return {
          kind: 'all',
          reason: `${path.relative(roots.mobileDir, storyFile)} (no story title)`,
        };
      }
      for (const story of stories) ids.add(story.id);
      for (const story of before.storiesByFile.get(storyFile) ?? []) ids.add(story.id);
    }
  }
  return { kind: 'stories', ids };
}

/**
 * Story ids in a story file, built as `.rnstorybook/story-registry.ts` gets
 * them from `composeStories`: Storybook's `toId(meta.id ?? meta.title, export)`
 * for every PascalCase value export.
 */
export function storiesIn(source: ts.SourceFile): StoryRef[] {
  const meta = defaultExportObject(source);
  const title = meta && stringProperty(meta, 'title');
  if (!meta || !title) return [];
  const idBase = stringProperty(meta, 'id') ?? title;
  return valueExportNames(source)
    .filter((name) => /^[A-Z]/.test(name))
    .map((name) => ({ id: toId(idBase, storyNameFromExport(name)), title }));
}

function importSpecifiers(source: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      !statement.importClause?.isTypeOnly &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  // `require('…')` and `import('…')` with a literal path, anywhere in the file.
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const [arg] = node.arguments;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
      const isImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if ((isRequire || isImport) && arg && ts.isStringLiteralLike(arg)) specifiers.push(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isSatisfiesExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function defaultExportObject(source: ts.SourceFile): ts.ObjectLiteralExpression | null {
  const assignment = source.statements.find(
    (s): s is ts.ExportAssignment => ts.isExportAssignment(s) && !s.isExportEquals,
  );
  if (!assignment) return null;
  let expression = unwrap(assignment.expression);
  if (ts.isIdentifier(expression)) {
    const name = expression.text;
    const declaration = source.statements
      .filter(ts.isVariableStatement)
      .flatMap((s) => s.declarationList.declarations)
      .find((d) => ts.isIdentifier(d.name) && d.name.text === name);
    if (!declaration?.initializer) return null;
    expression = unwrap(declaration.initializer);
  }
  return ts.isObjectLiteralExpression(expression) ? expression : null;
}

function stringProperty(object: ts.ObjectLiteralExpression, key: string): string | undefined {
  for (const property of object.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
      property.name.text === key &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text;
    }
  }
  return undefined;
}

function hasExportModifier(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function valueExportNames(source: ts.SourceFile): string[] {
  const names: string[] = [];
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      hasExportModifier(statement) &&
      statement.name &&
      !(ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      names.push(statement.name.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) names.push(element.name.text);
      }
    }
  }
  return names;
}

/** The `exports` map of `packages/shared/package.json`, e.g. `{ '.': './src/index.ts' }`. */
async function readSharedExports(sharedDir: string): Promise<Record<string, string>> {
  try {
    const pkg = JSON.parse(await readFile(path.join(sharedDir, 'package.json'), 'utf8')) as {
      exports?: Record<string, string>;
    };
    return pkg.exports ?? {};
  } catch {
    return {};
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.git') ? [] : listFiles(full);
      }
      return entry.isFile() ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Newest mtime among `files`, or 0. */
export async function newestMtime(files: Iterable<string>): Promise<number> {
  const times = await Promise.all(
    [...files].map(async (file) => (await stat(file).catch(() => null))?.mtimeMs ?? 0),
  );
  return Math.max(0, ...times);
}
