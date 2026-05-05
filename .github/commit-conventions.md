# Commit & Branch Conventions

## Branch Naming

Story branches follow the pattern: `story/<story-id>-<slug>`

Examples:
- `story/1.1-app-shell-navigation`
- `story/2.0-supabase-auth-setup`
- `story/1.3-design-system-theme`

The slug matches the story filename (without `.md`). The story ID uses dot notation (e.g., `1.0`, `1.1`). Each story is developed on its own branch, then squash-merged into `main`.

### Squash-Merge Commit Format

When squash-merging a story branch into main, use:

```
story(X.Y): emoji short description

- Key implementation details
- ...

Story: X-Y-story-slug
```

Example:
```
story(1.0): 🎉 scaffold monorepo with Expo SDK 55, Fastify 5, and shared workspace

- Initialized Bun workspaces: apps/mobile, apps/server, packages/shared
- Configured Oxlint 1.62, Oxfmt 0.47, TypeScript 5.9/6.0
- All gates pass: lint, format, typecheck, tests

Story: 1-0-project-scaffold-and-development-foundation
```

### Branch Cleanup

After a squash-merge, delete the story branch both locally and on the remote:

```bash
git branch -D story/X.Y-slug
git push origin --delete story/X.Y-slug
```

---

## Commit Messages

Commit messages follow the **conventional commit format with gitmojis**. 

## Format

```
type(scope): emoji short description

- Bullet point with more detail
- Another detail about what changed
- Why if not obvious
```

## Example

```
feat(tasks): ✨ add brain dump input component

- Created BrainDumpInput component with text area
- Added AI parsing hook for task extraction  
- Integrated with task store for persistence
```

## Available Types

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only changes
- `style` — Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor` — A code change that neither fixes a bug nor adds a feature
- `perf` — A code change that improves performance
- `test` — Adding missing tests or correcting existing tests
- `chore` — Changes to the build process or auxiliary tools and libraries such as documentation
- `ci` — Changes to our CI configuration files and scripts
- `build` — Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- `revert` — Revert to a previous commit

## Available Scopes (the general area of the code affected)

- `bmad` — BMAD core framework setup and configuration
- `planning` — BMAD project planning and design & spec documents and notes
- `analysis` — BMAD Analysis documents and research
- `config` — Project configuration (tsconfig, eslint, etc.)
- `app` — Main app code
- `backend` — Backend server code
- `api` — API code
- `ui` — UI components and styling
- `tasks` — Task-related features
- `ai` — AI integration code

To add a new scope (and don't be afraid to, if it is needed): propose it, confirm with the user, then add it to this list.

## Official Gitmoji Reference

| Emoji | Code | Usage |
|-------|------|-------|
| ✨ | `:sparkles:` | Introduce new features |
| 🐛 | `:bug:` | Fix a bug |
| 🚑️ | `:ambulance:` | Critical hotfix |
| 🔥 | `:fire:` | Remove code or files |
| 📝 | `:memo:` | Add or update documentation |
| 🎨 | `:art:` | Improve structure / format of the code |
| ⚡️ | `:zap:` | Improve performance |
| 💄 | `:lipstick:` | Add or update the UI and style files |
| 🎉 | `:tada:` | Begin a project |
| ✅ | `:white_check_mark:` | Add, update, or pass tests |
| 🔒️ | `:lock:` | Fix security or privacy issues |
| 🔐 | `:closed_lock_with_key:` | Add or update secrets |
| 🔖 | `:bookmark:` | Release / Version tags |
| 🚨 | `:rotating_light:` | Fix compiler / linter warnings |
| 🚧 | `:construction:` | Work in progress |
| 💚 | `:green_heart:` | Fix CI Build |
| ⬇️ | `:arrow_down:` | Downgrade dependencies |
| ⬆️ | `:arrow_up:` | Upgrade dependencies |
| 📌 | `:pushpin:` | Pin dependencies to specific versions |
| 👷 | `:construction_worker:` | Add or update CI build system |
| 📈 | `:chart_with_upwards_trend:` | Add or update analytics or track code |
| ♻️ | `:recycle:` | Refactor code |
| ➕ | `:heavy_plus_sign:` | Add a dependency |
| ➖ | `:heavy_minus_sign:` | Remove a dependency |
| 🔧 | `:wrench:` | Add or update configuration files |
| 🔨 | `:hammer:` | Add or update development scripts |
| 🌐 | `:globe_with_meridians:` | Internationalization and localization |
| ✏️ | `:pencil2:` | Fix typos |
| 💩 | `:poop:` | Write bad code that needs to be improved |
| ⏪️ | `:rewind:` | Revert changes |
| 🔀 | `:twisted_rightwards_arrows:` | Merge branches |
| 📦️ | `:package:` | Add or update compiled files or packages |
| 👽️ | `:alien:` | Update code due to external API changes |
| 🚚 | `:truck:` | Move or rename resources (e.g.: files, paths, routes) |
| 📄 | `:page_facing_up:` | Add or update license |
| 💥 | `:boom:` | Introduce breaking changes |
| 🍱 | `:bento:` | Add or update assets |
| ♿️ | `:wheelchair:` | Improve accessibility |
| 💡 | `:bulb:` | Add or update comments in source code |
| 🍻 | `:beers:` | Write code drunkenly |
| 💬 | `:speech_balloon:` | Add or update text and literals |
| 🗃️ | `:card_file_box:` | Perform database related changes |
| 🔊 | `:loud_sound:` | Add or update logs |
| 🔇 | `:mute:` | Remove logs |
| 👥 | `:busts_in_silhouette:` | Add or update contributor(s) |
| 🚸 | `:children_crossing:` | Improve user experience / usability |
| 🏗️ | `:building_construction:` | Make architectural changes |
| 📱 | `:iphone:` | Work on responsive design |
| 🤡 | `:clown_face:` | Mock things |
| 🥚 | `:egg:` | Add or update an easter egg |
| 🙈 | `:see_no_evil:` | Add or update a .gitignore file |
| 📸 | `:camera_flash:` | Add or update snapshots |
| ⚗️ | `:alembic:` | Perform experiments |
| 🔍️ | `:mag:` | Improve SEO |
| 🏷️ | `:label:` | Add or update types |
| 🌱 | `:seedling:` | Add or update seed files |
| 🚩 | `:triangular_flag_on_post:` | Add, update, or remove feature flags |
| 🥅 | `:goal_net:` | Catch errors |
| 💫 | `:dizzy:` | Add or update animations and transitions |
| 🗑️ | `:wastebasket:` | Deprecate code that needs to be cleaned up |
| 🛂 | `:passport_control:` | Work on code related to authorization, roles and permissions |
| 🩹 | `:adhesive_bandage:` | Simple fix for a non-critical issue |
| 🧐 | `:monocle_face:` | Data exploration/inspection |
| ⚰️ | `:coffin:` | Remove dead code |
| 🧪 | `:test_tube:` | Add a failing test |
| 👔 | `:necktie:` | Add or update business logic |
| 🩺 | `:stethoscope:` | Add or update healthcheck |
| 🧱 | `:bricks:` | Infrastructure related changes |
| 🧑‍💻 | `:technologist:` | Improve developer experience |
| 💸 | `:money_with_wings:` | Add sponsorships or money related infrastructure |
| 🧵 | `:thread:` | Add or update code related to multithreading or concurrency |
| 🦺 | `:safety_vest:` | Add or update code related to validation |
| ✈️ | `:airplane:` | Improve offline support |
| 🦖 | `:t-rex:` | Code that adds backwards compatibility |
| 🚀 | `:rocket:` | Deploy stuff |
