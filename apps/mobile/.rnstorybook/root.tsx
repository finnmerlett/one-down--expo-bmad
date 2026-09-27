import AsyncStorage from '@react-native-async-storage/async-storage';

import { view } from './storybook.requires';

// Native root: the on-device Storybook UI. Web resolves root.web.tsx instead.
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUIRoot;
