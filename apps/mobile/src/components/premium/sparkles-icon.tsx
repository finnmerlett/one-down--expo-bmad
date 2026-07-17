import { Path } from 'react-native-svg';

import { createIcon } from '@/components/ui/icon';

// Lucide `Sparkles` glyph via the gluestack createIcon helper — the icon
// catalogue in ui/icon has no sparkle, and per the UX spec the marker is an
// invitation (sparkle), never a lock.
export const SparklesIcon = createIcon({
  viewBox: '0 0 24 24',
  path: (
    <>
      <Path
        d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M20 3v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 5h-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 17v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 18H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
});

SparklesIcon.displayName = 'SparklesIcon';
