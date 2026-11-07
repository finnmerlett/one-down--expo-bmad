// @ts-nocheck — metro-config and @expo/metro type declarations disagree (known
// ecosystem mismatch); this file is runtime-correct and not part of tsc's include.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const config = getDefaultConfig(__dirname);

// drizzle migrations: .sql files resolve as modules (inlined by babel inline-import).
config.resolver.sourceExts.push('sql');

// Keep jest-only code out of the app bundle: better-sqlite3 (test-utils) is a
// Node native addon Metro must never try to resolve. (Plain RegExps — the
// metro-config exclusionList helper is no longer export-mapped.)
const defaultBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList)
    ? defaultBlockList
    : defaultBlockList
      ? [defaultBlockList]
      : []),
  /\.test\.(ts|tsx)$/,
  /\/src\/test-utils\/.*/,
];

// Web only: react-native-web ships Keyboard / KeyboardAvoidingView as no-ops.
// These shims (driven by the design canvas's mock keyboard) make web story
// frames react to a keyboard the way the Android app does. Web is not a
// shipped target — it only runs the story renderer behind apps/canvas.
const WEB_SHIMS = {
  'react-native-web/dist/exports/Keyboard/index.js': path.resolve(
    __dirname,
    '.rnstorybook/web-shims/keyboard.ts',
  ),
  'react-native-web/dist/exports/KeyboardAvoidingView/index.js': path.resolve(
    __dirname,
    '.rnstorybook/web-shims/keyboard-avoiding-view.tsx',
  ),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const result = context.resolveRequest(context, moduleName, platform);
  if (platform === 'web' && result.type === 'sourceFile') {
    const shim = Object.entries(WEB_SHIMS).find(([suffix]) => result.filePath.endsWith(suffix));
    if (shim) return { type: 'sourceFile', filePath: shim[1] };
  }
  return result;
};

// withStorybook (entry-swap wrapper) must be OUTERMOST. With STORYBOOK_ENABLED=true
// Metro serves .rnstorybook/index.tsx instead of expo-router/entry; otherwise it is
// a strict no-op and zero Storybook code enters the bundle.
module.exports = withStorybook(withNativeWind(config, { input: './src/global.css' }), {
  configPath: './.rnstorybook',
});
