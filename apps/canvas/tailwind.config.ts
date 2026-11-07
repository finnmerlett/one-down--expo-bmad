import type { Config } from 'tailwindcss';

// Canvas chrome only (toolbars, labels, annotations) — the frames themselves
// are the app's own NativeWind output inside iframes. Token names follow
// nearform/ignite so its canvas components port unchanged; values are
// RGB channels in src/index.css so opacity modifiers (bg-accent/5) work.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'bg-base': token('bg-base'),
        'bg-elevated': token('bg-elevated'),
        'bg-secondary': token('bg-secondary'),
        'bg-tertiary': token('bg-tertiary'),
        'border-standard': token('border-standard'),
        'border-subtle': token('border-subtle'),
        'text-primary': token('text-primary'),
        'text-secondary': token('text-secondary'),
        'text-tertiary': token('text-tertiary'),
        'text-on-accent': token('text-on-accent'),
        accent: token('accent'),
        info: token('info'),
        success: token('success'),
        warning: token('warning'),
        error: { DEFAULT: token('error'), bg: token('error-bg') },
      },
      fontFamily: {
        sans: ['Karla', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config;
