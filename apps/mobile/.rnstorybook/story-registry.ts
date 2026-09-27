/// <reference types="@storybook/react-native/metro-env" />
// Every story as a composed, renderable component — shared by the web root
// (design-canvas frames) and the native root's single-story mode (the device
// half of canvas-vs-device screenshot diffs), so both render the exact same
// tree around a story.
import { composeStories, setProjectAnnotations } from '@storybook/react';
import type { ComponentType } from 'react';

import * as previewAnnotations from './preview';

setProjectAnnotations([previewAnnotations]);

/** Per-story canvas settings: `parameters: { canvas: { … } }` in a story or meta. */
export interface CanvasParameters {
  /** Show the (mock, on web) on-screen keyboard over the story. */
  keyboard?: boolean;
}

export type StoryEntry = {
  id: string;
  title: string;
  name: string;
  canvas: CanvasParameters;
  Story: ComponentType;
};

export function collectStories(): StoryEntry[] {
  const req = require.context('../src', true, /\.stories\.tsx$/);
  return req.keys().flatMap((key) => {
    const mod = req(key);
    const title: string = mod.default?.title ?? key;
    // Story exports are PascalCase; lowercase ones are fixture helpers
    // (makeTask, makeDraft…) that composeStories would otherwise wrap.
    return Object.entries(composeStories(mod))
      .filter(([exportName]) => /^[A-Z]/.test(exportName))
      .map(([, story]) => ({
        id: story.id,
        title,
        name: story.storyName ?? story.id,
        canvas: (story.parameters?.canvas ?? {}) as CanvasParameters,
        Story: story as ComponentType,
      }));
  });
}
