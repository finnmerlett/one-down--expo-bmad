// NetInfo ships an official jest mock (native module otherwise) — Story 5.3.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
