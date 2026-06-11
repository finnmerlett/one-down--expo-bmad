# Story 1.1: App Shell & Navigation

Status: in-progress
Date: 2026-06-11
Mode: BMad-lite autonomous run (batched with 1.2: per-story commits, shared review + E2E cycle)

## Story

As a user, I want to open the One Down app and see a clean interface with navigation controls, So that I have a usable app foundation.

## Acceptance Criteria

Given a fresh install, when the user launches the app, then:

1. Top bar shows: task list icon (top-left), star box placeholder (second-to-left), settings icon (top-right)
2. Floating add button in the bottom-right corner
3. App locked to portrait orientation
4. Layout uses NativeWind/Tailwind utilities with safe-area insets

## Implementation decisions (planned)

- gluestack-ui v3 via CLI (`npx gluestack-ui add <component>`) per planning docs; `GluestackUIProvider` mounted at app root when first component lands. Fallback to thin NativeWind wrappers only if the CLI won't install cleanly (gas-town hand-rolled its own — planning docs supersede that).
- Icons: Lucide via gluestack `Icon` integration.
- No bottom tab bar (UX spec). Single expo-router `Stack`, `headerShown: false` (already in place from 1.0).
- `SafeAreaView` from react-native-safe-area-context with `edges={['top','left','right','bottom']}` — bottom edge keeps the FAB above the Android gesture bar. **On-device check required** (never verified by prior run).
- Portrait already locked via `app.json` `"orientation": "portrait"` (1.0).
- Accessibility labels double as Maestro selectors: "Open task list", "View star activity", "Open settings", "Add task" (gas-town convention kept).
- Icon buttons navigate nowhere yet (screens land in 1.5/4.2/8.x) — real Pressables with a11y labels; FAB wiring lands in 1.2.
- Focus order = render order: top bar → content → FAB (UX a11y spec).

## Tasks

- [x] gluestack-ui v3 CLI init + add needed components; mount GluestackUIProvider (fallback: thin NativeWind wrappers)
- [x] AppShell feature components: `components/app-shell/{app-shell,top-bar,star-box-placeholder,floating-add-button}.tsx`
- [x] Home screen renders AppShell (placeholder content area until 1.3 stack)
- [x] Stories per component + full-shell story; portable-story crash tests
- [x] Maestro flow `02-story-1-1-app-shell.yaml` written (asserts all four controls visible) — RUN pending batch E2E
- [x] Gates: lint:check, typecheck, test (10/10)
- [ ] Batch: fresh-context review (with 1.2) → E2E release build → Maestro → screenshot → on-device FAB-clearance check → status done

## Dev Notes

- **gluestack-ui v3 CLI**: `init` is unavoidably interactive (raw-mode prompts, no `--yes`; headless expect-driving fought a zero-width PTY) — the USER ran `init` + `add` interactively. **`add` is non-interactive** — future per-story component installs can run autonomously: `bunx gluestack-ui@3.0.11 add <component> --use-bun`.
- **CLI did real config damage — all reverted** (`git checkout`): babel.config.js (re-added manual `react-native-worklets/plugin` — the exact 1.0-review bug — dropped `jsxImportSource: 'nativewind'` + transform-remove-console, added module-resolver alias), metro.config.js (deleted withStorybook wrapper + blockList, wrong global.css path), tsconfig churn, and DOWNGRADED pins (reanimated 4.3.1→4.1, worklets 0.8.3→0.5.1, nativewind 4.2.5→4.1.23) — pins restored, `prettier-plugin-tailwindcss`/`babel-plugin-module-resolver` dropped. **Rule: after any gluestack CLI run, diff-review configs before proceeding.**
- Kept from CLI: `src/components/ui/*` (10 components), runtime deps (@gluestack-ui/core+utils, @legendapp/motion, react-aria, react-stately, react-native-svg, tailwind-variants, @expo/html-elements), tailwind.config tokens/safelist (content globs trimmed to `./src/**`), provider in `_layout.tsx` (mode="light", innermost — wraps Stack inside AppPostHogProvider).
- Deleted `.web.tsx`/`.next15.tsx`/`script.ts` variants from generated components (native-only app; icon's web variant had a TS2538 error).
- Theme arrives at runtime via `vars()` in `gluestack-ui-provider/config.ts` — global.css untouched.
- Built-in gluestack icon set covers this story (MenuIcon/StarIcon/SettingsIcon/AddIcon) — **no lucide-react-native dep needed**.
- `SafeAreaView` (react-native-safe-area-context) needs explicit `cssInterop(SafeAreaView, { className: 'style' })` — NativeWind only auto-interops RN core. expo-router provides SafeAreaProvider.
- jest transformIgnorePatterns allowlist gained `@gluestack-ui/.*|@legendapp/.*|@expo/html-elements|tailwind-variants` (untranspiled ESM).
- ScreenPlaceholder (1.0/1.0a scaffold vehicle) deleted; `01-story-1-0a-app-launches.yaml` anchor switched 'Welcome to Expo' → 'Add task'.
- tailwind.config: `@ts-ignore` on the nativewind preset require — editor-only TS2306 (upstream d.ts isn't a module).
- Process incident: the previous (closed-window) session was still alive and racing this one on the same tree — killed PID tree; only its expect/init attempts were in flight, no file damage.
