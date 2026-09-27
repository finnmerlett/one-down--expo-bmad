import { useEffect, useState } from 'react';

// Canvas chrome theme only — the frames render the app's own theme, which
// is light, so the canvas defaults to light too (a dark board makes light
// screens look wrong). v2 key: v1 auto-saved 'system' on first load.
export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'one-down-canvas-theme-v2';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // storage blocked: fall through to the default
  }
  return 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  // Persist only an explicit choice, so a later default change still lands.
  const choose = (next: ThemePreference) => {
    setPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: the choice just won't persist
    }
  };

  return { preference, resolved, setPreference: choose };
}
