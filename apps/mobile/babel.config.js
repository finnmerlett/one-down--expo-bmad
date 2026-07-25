module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV ?? 'development');
  const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Do NOT add react-native-worklets/plugin here: babel-preset-expo (SDK 56)
    // auto-appends it as the genuinely-last plugin when the package is installed.
    // A manual top-level entry would run FIRST (before preset plugins) and
    // workletize code before the other transforms — the silent-failure class
    // the old react-native-reanimated/plugin guidance warned about.
    plugins: [
      // Inlines drizzle's generated .sql files as strings (drizzle/migrations.js).
      ['inline-import', { extensions: ['.sql'] }],
      // warn/error survive release builds: they are the error-path signal the
      // E2E harness reads from logcat (scripts/maestro-test.sh dumps
      // ReactNativeJS) — stripping ALL console made release failures silent.
      ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};
