import React from 'react';
import type { Preview } from '@storybook/react-native';

import { GluestackUIProvider } from '../src/components/ui/gluestack-ui-provider';

const preview: Preview = {
  // Every story renders inside the app's real provider context (theme vars()).
  decorators: [
    (Story) => (
      <GluestackUIProvider mode="light">
        <Story />
      </GluestackUIProvider>
    ),
  ],
  parameters: {},
};

export default preview;
