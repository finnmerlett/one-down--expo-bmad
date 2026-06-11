// NativeWind styles ship with whichever module imports global.css. The normal
// app gets them via src/app/_layout.tsx, which this entry swap bypasses —
// without this import every className in the Storybook bundle is a no-op
// (unbounded SVG icons then crash Android with a too-large bitmap).
import '../src/global.css';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';

import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

// This file replaces expo-router/entry when STORYBOOK_ENABLED=true (metro
// entry swap), so it must register the root component itself.
registerRootComponent(StorybookUIRoot);

export default StorybookUIRoot;
