// Composes react-native-worklets' jest resolver behavior (strip `.native.*`
// extensions for worklets imports so its jest mocks resolve instead of the
// real native module, which throws off-device) with the @react-native
// resolver that jest-expo's preset normally installs.
const rnResolver = require('@react-native/jest-preset/jest/resolver.js');

module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }
  return rnResolver(request, options);
};
