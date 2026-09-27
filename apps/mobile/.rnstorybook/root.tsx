import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ComponentRow,
  DEFAULT_GROUP_ITEM_WIDTH,
  RendererProviders,
  ScreenFrame,
} from './story-frames';
import { collectStories } from './story-registry';
import { view } from './storybook.requires';

// Native root: the on-device Storybook UI — or, opened through a deep link,
// one story on its own, exactly as the web canvas frames it (the device half
// of the canvas-vs-device screenshot diffs, scripts/canvas-diff):
//
//   adb shell am start -a android.intent.action.VIEW \
//     -d "onedown://story?id=<story-id>" com.onedown.mobile.dev
//
// `?title=<meta-title>` shows a component's states in a row, as on the canvas;
// `onedown://story` with neither returns to the Storybook UI.
const StorybookUIRoot = view.getStorybookUI({
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

/**
 * Logs once the linked story has rendered (inside RendererProviders, so after
 * fonts load). The diff harness waits for this line in logcat so it never
 * captures the previous story — uiautomator can't tell: it never sees an
 * idle screen while the card stack animates.
 */
function MountMarker({ nonce }: { nonce?: string }) {
  useEffect(() => {
    // oxlint-disable-next-line no-console
    if (nonce) console.log(`canvas-story-mounted ${nonce}`);
  }, [nonce]);
  return null;
}

function useStoryLink(): { id?: string; title?: string; nonce?: string; url?: string } {
  const url = Linking.useLinkingURL();
  return useMemo(() => {
    if (!url) return {};
    const { hostname, queryParams } = Linking.parse(url);
    if (hostname !== 'story') return {};
    const param = (key: string) => {
      const value = queryParams?.[key];
      return typeof value === 'string' && value ? value : undefined;
    };
    return { id: param('id'), title: param('title'), nonce: param('n'), url };
  }, [url]);
}

export default function StorybookRoot() {
  // Keyed by the whole link, so re-opening one (e.g. with a fresh `&n=` nonce)
  // remounts the story from scratch.
  const { id, title, nonce, url } = useStoryLink();
  const stories = useMemo(() => (id || title ? collectStories() : []), [id, title]);
  if (!id && !title) return <StorybookUIRoot />;

  const entry = id ? stories.find((story) => story.id === id) : undefined;
  const row = title ? stories.filter((story) => story.title === title) : [];
  return (
    <SafeAreaProvider>
      <RendererProviders>
        <MountMarker nonce={nonce} />
        {entry ? (
          <ScreenFrame key={url} entry={entry} />
        ) : row.length > 0 ? (
          <ComponentRow key={url} entries={row} itemWidth={DEFAULT_GROUP_ITEM_WIDTH} />
        ) : (
          <Text style={{ padding: 16 }}>No story “{id ?? title}”.</Text>
        )}
      </RendererProviders>
    </SafeAreaProvider>
  );
}
