jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      ScrollView: require('react-native').ScrollView,
      createAnimatedComponent: (component) => component,
      addWhitelistedNativeProps: () => {},
      addWhitelistedUIProps: () => {},
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedGestureHandler: () => ({}),
    withSpring: (val) => val,
    withTiming: (val, _config, callback) => {
      if (callback) callback(true);
      return val;
    },
    withDelay: (_delay, val) => val,
    withSequence: (...vals) => vals[vals.length - 1],
    withRepeat: (val) => val,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: { linear: (v) => v, ease: (v) => v, bezier: () => (v) => v },
    FadeIn: { duration: () => ({ build: () => {} }) },
    FadeOut: { duration: () => ({ build: () => {} }) },
    Layout: { duration: () => ({ build: () => {} }) },
  };
});

jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');

  const gestureChain = () =>
    new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop === '_handlers') return {};
          return () => gestureChain();
        },
      },
    );

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    PanGestureHandler: View,
    TapGestureHandler: View,
    Gesture: {
      Pan: gestureChain,
      Tap: gestureChain,
      Fling: gestureChain,
    },
    State: {},
    Directions: {},
  };
});
