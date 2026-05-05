import * as SecureStore from 'expo-secure-store';

export const secureStoreAdapter = {
  getItem(key: string): string | null {
    return SecureStore.getItem(key);
  },
  setItem(key: string, value: string): void {
    SecureStore.setItem(key, value);
  },
  removeItem(key: string): void {
    SecureStore.deleteItemAsync(key);
  },
};
