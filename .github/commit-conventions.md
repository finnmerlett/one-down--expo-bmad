# Commit & Branch Conventions

## Branches

Pattern: `story/<story-id>-<slug>` (slug matches story filename without `.md`, dot notation for ID)

Sub-stories use middle dot in filenames and slug `1-3·1-card-stack-cycling` (keeps correct file sort order).

Squash-merge format:
```
story(X.Y): <emoji> <short description>

- Key implementation details
```

After merge: `git branch -D story/X.Y-slug && git push origin --delete story/X.Y-slug`

## Commits

Format: `type(scope): emoji short description` + optional bullet body.

**Types:** feat · fix · docs · style · refactor · perf · test · chore · ci · build · revert

**Scopes:** bmad · planning · analysis · config · app · backend · api · ui · tasks · ai
_(Add new scopes as needed — propose to user first, then add here.)_

## Gitmoji Reference

Pick the most interesting gitmoji that still precisely fits the change. Eg. avoid always defaulting to ✨, use more specific emojis if appropriate.

✨ new feature · 🐛 bug fix · 🚑️ critical hotfix · 🔥 remove code/files · 📝 docs · 🎨 structure/format · 💄 UI/style · 🎉 begin project · ✅ tests · 🔧 config · ♻️ refactor · ⚡️ performance · 🚧 WIP · 🏗️ architecture · 🗃️ database · ⬆️ upgrade deps · ➕ add dep · ➖ remove dep · 🚚 move/rename · 💥 breaking change · 🔒️ security fix · 👷 CI · 🏷️ types · 🩹 minor fix · ⚰️ dead code · 🧪 failing test · 👔 business logic · 💫 animations · 🔨 dev scripts · 🛂 auth/permissions · 🚨 linter warnings · 🗑️ deprecate · 📈 analytics · 🧑‍💻 DX · 🍱 assets
