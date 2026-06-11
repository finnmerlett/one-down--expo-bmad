import { setProjectAnnotations } from '@storybook/react';

import * as previewAnnotations from './.rnstorybook/preview';

// Portable Stories pick up the global decorators/parameters from .rnstorybook/preview,
// so headless Jest renders match on-device Storybook rendering.
setProjectAnnotations([previewAnnotations]);
