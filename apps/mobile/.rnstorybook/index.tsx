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
