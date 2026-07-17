import * as SecureStore from 'expo-secure-store';

import type { SupportedStorage } from '@supabase/supabase-js';

// Session persistence for Supabase auth over expo-secure-store (NFR-S1 —
// tokens live in the Android Keystore, never AsyncStorage).
//
// SecureStore warns above 2048 bytes per value; the Supabase session (~2–4KB)
// still stores fine on modern Android — the E2E restart-persistence step is
// the proof. If writes ever fail on-device, chunk values inside this adapter.
export const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};
