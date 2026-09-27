import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { useColorScheme } from 'nativewind';

import { config, palettes } from './config';

export type ModeType = 'light' | 'dark' | 'system';

/**
 * Web variant (web only runs the design-canvas story renderer). On native,
 * NativeWind hands the theme vars() down the React tree, so a Modal's content
 * inherits them; on web they are real CSS custom properties, which inherit
 * through the DOM — and a Modal portals to <body>, outside this View. So the
 * palette is also published on :root, and modals/sheets get the theme too.
 */
export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (colorScheme !== mode) {
      setColorScheme(mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement.style;
    for (const [name, value] of Object.entries(
      palettes[colorScheme === 'dark' ? 'dark' : 'light'],
    )) {
      root.setProperty(name, value);
    }
  }, [colorScheme]);

  return (
    <View style={[config[colorScheme!], { flex: 1, height: '100%', width: '100%' }, props.style]}>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
