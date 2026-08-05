import type * as UpdatesType from 'expo-updates';

/**
 * expo-updates, resolved defensively: dev-client builds made before the
 * module was linked (or with updates stripped) throw "Cannot find native
 * module 'ExpoUpdates'" at import time, which took the whole app down via
 * the update banner. When the native module is absent we substitute an inert
 * stub with the same surface, so callers (and their hooks) run unconditionally
 * — `useUpdates` here is a legitimate zero-hook hook returning a constant.
 */
const STUB = {
  isEnabled: false,
  useUpdates: () => ({ isUpdatePending: false }),
  reloadAsync: async () => {},
  checkForUpdateAsync: async () => ({ isAvailable: false }),
  fetchUpdateAsync: async () => ({ isNew: false }),
} as unknown as typeof UpdatesType;

function resolveUpdates(): typeof UpdatesType {
  try {
    // oxlint-disable-next-line no-require-imports
    return require('expo-updates') as typeof UpdatesType;
  } catch {
    return STUB;
  }
}

export const Updates = resolveUpdates();
