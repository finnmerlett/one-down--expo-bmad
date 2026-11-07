// NativeWind styles ship with whichever module imports global.css. The normal
// app gets them via src/app/_layout.tsx, which this entry swap bypasses —
// without this import every className in the Storybook bundle is a no-op
// (unbounded SVG icons then crash Android with a too-large bitmap).
import '../src/global.css';

import { registerRootComponent } from 'expo';

// Platform-resolved: root.tsx is the on-device Storybook UI, root.web.tsx the
// one-story-per-URL renderer the design canvas (apps/canvas) frames.
import StorybookRoot from './root';

// This file replaces expo-router/entry when STORYBOOK_ENABLED=true (metro
// entry swap), so it must register the root component itself.
registerRootComponent(StorybookRoot);

export default StorybookRoot;
