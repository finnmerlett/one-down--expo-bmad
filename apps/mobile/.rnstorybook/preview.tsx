import type { Preview } from '@storybook/react-native';

const preview: Preview = {
  // Global decorators (e.g. GluestackUIProvider once Story 1.1 adds it) go here
  // so every story renders inside the app's real provider context.
  decorators: [],
  parameters: {},
};

export default preview;
