// Web stand-in for react-native-web's Keyboard, which is a no-op (no events,
// never visible). metro.config.js swaps it in for web bundles so the story
// renderer's mock keyboard can raise real `keyboardDidShow` / `keyboardDidHide`
// events — the components that pad themselves for the keyboard on Android
// then react exactly as they do on the device.
import dismissKeyboard from 'react-native-web/dist/modules/dismissKeyboard';

export interface KeyboardMetrics {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

type KeyboardEventName =
  | 'keyboardWillShow'
  | 'keyboardDidShow'
  | 'keyboardWillHide'
  | 'keyboardDidHide';
type Listener = (event: {
  endCoordinates: KeyboardMetrics;
  duration: number;
  easing: string;
}) => void;

const listeners = new Map<string, Set<Listener>>();
let metrics: KeyboardMetrics | null = null;
const visibilityWatchers = new Set<(visible: boolean) => void>();

function emit(name: KeyboardEventName, endCoordinates: KeyboardMetrics) {
  for (const listener of listeners.get(name) ?? [])
    listener({ endCoordinates, duration: 0, easing: 'keyboard' });
}

/** Raise (metrics) or drop (null) the keyboard, firing the matching events. */
export function setMockKeyboard(next: KeyboardMetrics | null) {
  const previous = metrics;
  metrics = next;
  if (next) {
    emit('keyboardWillShow', next);
    emit('keyboardDidShow', next);
  } else if (previous) {
    const gone = { ...previous, screenY: previous.screenY + previous.height, height: 0 };
    emit('keyboardWillHide', gone);
    emit('keyboardDidHide', gone);
  }
  for (const watcher of visibilityWatchers) watcher(next !== null);
}

/** For the mock keyboard UI: follow dismiss() calls made by the story. */
export function watchMockKeyboard(watcher: (visible: boolean) => void): () => void {
  visibilityWatchers.add(watcher);
  return () => visibilityWatchers.delete(watcher);
}

const Keyboard = {
  addListener(name: string, listener: Listener) {
    const set = listeners.get(name) ?? new Set<Listener>();
    listeners.set(name, set);
    set.add(listener);
    return { remove: () => set.delete(listener) };
  },
  removeAllListeners(name: string) {
    listeners.delete(name);
  },
  removeListener(name: string, listener: Listener) {
    listeners.get(name)?.delete(listener);
  },
  dismiss() {
    dismissKeyboard();
    setMockKeyboard(null);
  },
  isVisible() {
    return metrics !== null;
  },
  metrics() {
    return metrics ?? undefined;
  },
};

export default Keyboard;
