# One Down design canvas

A zoomable canvas of every One Down screen, laid out as user journeys. Every
frame is the **real screen**: an iframe onto a Storybook story rendered by
Metro's web target, using the app's own babel/NativeWind pipeline, with the
phone's safe-area insets, status bar, gesture handle and (where the user is
typing) keyboard. There is no design file to keep in sync. Edit a component
or story and its frames hot-reload.

Adapted from the canvas in [nearform/ignite](https://github.com/nearform/ignite)
(pan/zoom stage, tools, keyboard navigation, sticky notes and images saved into
the repo).

## Run

```bash
bun run canvas        # story renderer on :8083 + canvas on :8084
```

Open http://localhost:8084. The first frames appear once Metro finishes its
first web bundle (~15 s cold).

## Controls

| Input                             | Does                                                      |
| --------------------------------- | --------------------------------------------------------- |
| Scroll (vertical / horizontal)    | Pan the canvas up/down, left/right                        |
| Middle-button drag                | Pan                                                       |
| Hold middle button + scroll       | Zoom around the cursor                                    |
| Trackpad pinch (or Ctrl + scroll) | Zoom around the cursor                                    |
| `V` / `H` / `S` / `I`             | Select, Pan tool (left-drag pans), Sticky note, Add image |
| Space + left-drag                 | Pan                                                       |
| Arrow keys                        | Step frame to frame                                       |

Over a live screen (Select tool at 80%+ zoom), a scroll the story can use
itself (a list with room to scroll) scrolls the story. Anything else is
forwarded to the canvas, so panning never gets stuck on a frame.

## How it fits together

| Piece           | Where                                                     | What it does                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screen stories  | `apps/mobile/src/components/**/<x>-screen.stories.tsx`    | `title: 'screens/<Name>'`. Each route is a thin data wrapper around a props-only `<Name>Screen`; its stories render the whole screen in each state, with local UI state so frames are clickable. |
| Story renderer  | `apps/mobile/.rnstorybook/root.web.tsx`                   | Web-only root behind the Storybook entry swap. `?id=<story>` renders one story. `?title=<component>&w=` renders all of a component's stories in a row. No params gives the index.                |
| Native renderer | `apps/mobile/.rnstorybook/root.tsx`                       | On the dev build, `onedown://story?id=<story>` shows one story exactly as a canvas frame does — the device half of the fidelity diffs.                                                           |
| Journeys        | `src/journeys.ts`                                         | Which stories make up each user flow, in order. Stories not placed here fill the component library below.                                                                                        |
| Frames          | `src/components/story-frame.tsx`                          | Live iframe only while on screen and zoom ≥ 35%. Otherwise the snapshot the renderer posted (each live frame costs ~50 MB and ~0.9 s).                                                           |
| Annotations     | `src/lib/server/*` + `vite.config.ts`                     | Sticky notes and dropped images, saved to `canvas-data/annotations.json` and `public/canvas-images/` (commit them).                                                                              |
| Web shims       | `apps/mobile/.rnstorybook/web-shims/` + `metro.config.js` | react-native-web's no-op `Keyboard` / `KeyboardAvoidingView`, made real so the mock keyboard pads screens as Android does.                                                                       |

## Adding a screen state

1. Add an export to the screen's `<x>-screen.stories.tsx` (seed its UI state
   through the `Interactive<X>` wrapper's `initial…` args). If the user is
   typing in that state, add `parameters: { canvas: { keyboard: true } }`.
2. Place it on a journey in `src/journeys.ts`: `{ story: '<story-id>', label,
note }`. Ids are Storybook's `<title>--<export>` kebab-cased (the "All
   stories" panel lists them). A wrong id shows as a red frame.

Component stories whose component only appears on one screen get
`parameters: { canvas: { library: false } }` once a screen story shows it in
context — they stay for tests and on-device Storybook.

## Checking fidelity against the device

```bash
bun --cwd apps/canvas diff                                  # the default screen set
bun --cwd apps/canvas diff screens-home--quick-add:keyboard # specific stories
```

Renders each story on an Android emulator (dev build in single-story mode)
and in headless Chrome at the emulator's dp size, insets, locale and
timezone, then pixel-diffs them with the status bar, gesture area and
keyboard masked. `diff-output/<run>/` gets a device | web | diff image per
story. Around 1–3% is the text-antialiasing floor (Android and Chrome
rasterise fonts differently); anything structural shows up as shifted or
recoloured blocks in the diff column.

Setup: an emulator running the dev build (`com.onedown.mobile.dev`) against
a Storybook Metro — `STORYBOOK_ENABLED=true npx expo start --dev-client --port 8085`
in `apps/mobile`, `adb reverse tcp:8085 tcp:8085`, open
`exp+one-down://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8085`
— plus the web renderer on :8083. Append `:keyboard` to a story id to tap its
first text field on the device (the web side uses the mock keyboard).

Web fidelity fixes the diffs found, all global: web `rem` pinned to
NativeWind's native 14px; theme variables published on `:root` so modals
(portals) get them; `SectionList` registered with NativeWind; custom icons
built like the catalogue ones.

## Known gaps

- Snapshots draw text inside inputs (for example card-back titles) in a
  fallback font. Live frames are correct.
- Web ≠ Android at the font-rasteriser level: judge layout, spacing, colour
  and flow on the canvas; pixel-level type rendering on the device.
