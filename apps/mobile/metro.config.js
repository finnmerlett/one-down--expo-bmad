// @ts-nocheck — metro-config and @expo/metro type declarations disagree (known
// ecosystem mismatch); this file is runtime-correct and not part of tsc's include.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withStorybook } = require('@storybook/react-native/withStorybook');

const config = getDefaultConfig(__dirname);

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

// withStorybook (entry-swap wrapper) must be OUTERMOST. With STORYBOOK_ENABLED=true
// Metro serves .rnstorybook/index.tsx instead of expo-router/entry; otherwise it is
// a strict no-op and zero Storybook code enters the bundle.
module.exports = withStorybook(withNativeWind(config, { input: './src/global.css' }), {
  configPath: './.rnstorybook',
});
