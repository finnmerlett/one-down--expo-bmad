// jest-expo's preset supplies the correct transforms for Expo/RN packages.
// transformIgnorePatterns[0] REPLACES the preset's allowlist regex (a negative
// lookahead can't be extended in place): it's the Storybook RN expo-example's
// known-good pattern extended with storybook (ESM), nativewind runtime, and
// the PostHog SDK. The preset's auxiliary entries (reanimated babel plugin,
// @react-native/babel-preset — which must NOT go through babel-jest) are
// re-appended verbatim.
const preset = require('jest-expo/jest-preset');

// lucide-react-native resolves to its ESM .mjs build under the RN resolver,
// but the preset's babel-jest transform only matches `\.[jt]sx?$` — widen the
// key to include .mjs (same transformer, otherwise untouched).
const { ['\\.[jt]sx?$']: codeTransform, ...otherTransforms } = preset.transform;

module.exports = {
  ...preset,
  transform: { ...otherTransforms, '\\.m?[jt]sx?$': codeTransform },
  // Worklets/reanimated must resolve their jest mocks instead of native
  // modules — see jest-resolver.js (composes the preset's RN resolver).
  resolver: '<rootDir>/jest-resolver.js',
  setupFiles: [...(preset.setupFiles ?? []), 'react-native-gesture-handler/jestSetup.js'],
  setupFilesAfterEnv: [...(preset.setupFilesAfterEnv ?? []), '<rootDir>/setup-portable-stories.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|jest-expo|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|storybook|@storybook/.*|uuid|@react-native/.*|nativewind|react-native-css-interop|posthog-react-native|@posthog/.*|@gluestack-ui/.*|@legendapp/.*|@expo/html-elements|tailwind-variants|lucide-react-native|standard-navigation)',
    ...preset.transformIgnorePatterns.slice(1),
  ],
};
