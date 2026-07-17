import { Platform } from 'react-native';

import { getApiBaseUrl } from './api-url';

describe('getApiBaseUrl', () => {
  const originalOverride = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (originalOverride === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalOverride;
    }
    jest.restoreAllMocks();
  });

  it('prefers the EXPO_PUBLIC_API_URL override over platform defaults', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.20:3000';
    jest.replaceProperty(Platform, 'OS', 'android');

    expect(getApiBaseUrl()).toBe('http://192.168.1.20:3000');
  });

  it('defaults to the emulator host loopback on android', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.replaceProperty(Platform, 'OS', 'android');

    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });

  it('defaults to localhost off android', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.replaceProperty(Platform, 'OS', 'ios');

    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });
});
