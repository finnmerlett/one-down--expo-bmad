import type { SupportedStorage } from '@supabase/supabase-js';

// Web has no expo-secure-store; web only runs the design-canvas story
// renderer (.rnstorybook/root.web.tsx), never a real signed-in session, so
// plain localStorage keeps supabase-js's auth refresh from throwing there.
export const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
