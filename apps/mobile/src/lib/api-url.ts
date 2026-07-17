import { Platform } from 'react-native';

// Kept separate from trpc.tsx so the branching is unit-testable without React.
//
// NOTE: EXPO_PUBLIC_* vars are inlined at Metro bundle time — restart Metro
// (or rebuild the APK) after changing EXPO_PUBLIC_API_URL.
export function getApiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;
  // The Android emulator reaches the host loopback at 10.0.2.2 (works even
  // for 127.0.0.1-bound ports); everything else talks to localhost directly.
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}
