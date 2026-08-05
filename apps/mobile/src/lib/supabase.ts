import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { secureStoreAdapter } from './secure-store';

// Publicly-known supabase-local demo anon key (a constant of the local stack,
// not a secret) — fallback so local dev works with zero env setup.
const LOCAL_DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Mirrors getApiBaseUrl (Story 5.1): env override wins, Android emulator
// reaches the host loopback at 10.0.2.2. EXPO_PUBLIC_* is inlined at Metro
// bundle time — rebuild after changing it.
export function getSupabaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (override) return override;
  return Platform.OS === 'android' ? 'http://10.0.2.2:54321' : 'http://127.0.0.1:54321';
}

export const supabase = createClient(
  getSupabaseUrl(),
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || LOCAL_DEMO_ANON_KEY,
  {
    auth: {
      storage: secureStoreAdapter,
      // Pinned: supabase-js derives its default key from the server URL's
      // hostname, so an embedded APK bundle and an OTA bundle baked with
      // different EXPO_PUBLIC_SUPABASE_URLs store the session under
      // DIFFERENT keys — a relaunch that swaps bundles signs the user out
      // (found via e2e flow 52, 2026-08-05). One stable key survives any
      // URL change.
      storageKey: 'onedown-auth',
      autoRefreshToken: true,
      persistSession: true,
      // No web OAuth redirects in the native app.
      detectSessionInUrl: false,
    },
  },
);

// Supabase RN pattern: only refresh tokens while the app is foregrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
