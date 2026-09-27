# One Down design canvas

A zoomable canvas of every One Down screen, laid out as user journeys. Every
frame is the **real component**: an iframe onto a Storybook story rendered by
Metro's web target, using the app's own babel/NativeWind pipeline. So there is
no design file to keep in sync. Edit a component or story and its frames
hot-reload.

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

| Piece          | Where                                   | What it does                                                                                                                                                                                 |
| -------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story renderer | `apps/mobile/.rnstorybook/root.web.tsx` | Web-only root behind the Storybook entry swap. `?id=<story>` renders one story (a screen). `?title=<component>&w=` renders all of a component's stories in a row. No params gives the index. |
| Journeys       | `src/journeys.ts`                       | Which stories make up each user flow, in order. Stories not placed here fill the component library below the journeys.                                                                       |
| Frames         | `src/components/story-frame.tsx`        | Live iframe only while on screen and zoom ≥ 35%. Otherwise it shows the snapshot the renderer posted, because each live frame costs ~50 MB and ~0.9 s.                                       |
| Annotations    | `src/lib/server/*` + `vite.config.ts`   | Sticky notes and dropped images, saved to `canvas-data/annotations.json` and `public/canvas-images/` (commit them).                                                                          |

## Adding a screen

1. Write (or reuse) a story next to the component: `thing.stories.tsx`.
2. Add `{ story: '<story-id>', label: '…', note: '…' }` to a journey in
   `src/journeys.ts`. Ids are Storybook's `<title>--<export>`, kebab-cased; the
   "All stories" panel on the canvas lists them all. A wrong id shows as a red
   frame.

## Known gaps

- Frames are Storybook stories, so they show whatever the story composes.
  Several routes keep their header, tabs and safe-area chrome in the route
  file (`src/app/*.tsx`), so their frames are the screen body only.
- Snapshots draw text inside inputs (for example card-back titles) in a
  fallback font. Live frames are correct.
- Web ≠ Android: close enough to judge layout and flow, but check pixel
  details on the device.
