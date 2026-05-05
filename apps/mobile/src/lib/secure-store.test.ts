jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';

import { secureStoreAdapter } from './secure-store';

const mockedGetItem = SecureStore.getItem as jest.Mock;
const mockedSetItem = SecureStore.setItem as jest.Mock;
const mockedDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('secureStoreAdapter', () => {
  test('getItem delegates to SecureStore.getItem', () => {
    mockedGetItem.mockReturnValue('stored-value');

    const result = secureStoreAdapter.getItem('auth-token');

    expect(mockedGetItem).toHaveBeenCalledWith('auth-token');
    expect(result).toBe('stored-value');
  });

  test('getItem returns null when no value stored', () => {
    mockedGetItem.mockReturnValue(null);

    const result = secureStoreAdapter.getItem('missing-key');

    expect(result).toBeNull();
  });

  test('setItem delegates to SecureStore.setItem', () => {
    secureStoreAdapter.setItem('auth-token', 'jwt-value');

    expect(mockedSetItem).toHaveBeenCalledWith('auth-token', 'jwt-value');
  });

  test('removeItem delegates to SecureStore.deleteItemAsync', () => {
    secureStoreAdapter.removeItem('auth-token');

    expect(mockedDeleteItemAsync).toHaveBeenCalledWith('auth-token');
  });
});
