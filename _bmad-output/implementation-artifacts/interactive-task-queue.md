# Interactive task queue

Tasks that need Finn live — visual tweaking at the computer with the phone
connected, or design discussion — per protocol v2 (2026-08-17). Each is
mirrored in the Keep list with a `RECORDED: ` prefix; Finn ticks the Keep
item if he's happy with it being recorded as-is. Executed items get moved
into the fixes story of the session that does them.

| Keep id | Item | Source |
|---------|------|--------|
| `cbx.cjo1uf5hkuqj` | Home-screen card visual tweaks + size/position of the get-help prompt (also covers the health-prompt button clipping/multiline noted on `cbx.5vxsgcnonfyn`) | Finn, 2026-08-17 |
| `cbx.lh460hwefilz` | Triage award maths: half a star per confirmed item instead of the flat +5 (half-star icon on the confirm button). Discussion needed: the ledger stores integer amounts; halves change the economy + retro rows | Finn, 2026-08-17 |
| `cbx.gelo9yjtp1t3` | Defer system: deferredUntil date hides a card from the stack; "Deferred" section in the full list; Defer replaces Keep it on the help prompt; corner cross dismisses the prompt. Needs: defer-date picking UX, prompt layout (live), schema + curation changes | Finn, 2026-08-17 |
| (new) | Card dimensions + stack clipping/overlap live-tweak session; storybook pass on the phone | ~comments on `tlczvpvc621y` / `4k06x6s32vut` |
| (new) | Bonus-bar dark palette rework — dark gold reads brown; likely keep light bar colours in dark theme | ~comment on `s1trv74q7fhu` |
| (new) | Mutually-exclusive context requirements — design exploration (the dot/filter mismatch bug is being fixed separately as code) | `cbx.o2u93vm22tk4` second half |
| `1a008473ac0` | Triage force-all residue: size + deadline forcing SHIPPED (G1); still open — forcing contexts needs a "no context needed" affordance, and criticality reads Chill-by-default so forcing a tap needs a design call | Finn's `~` on the F1 INPUT NEEDED item |

| `cbx.b8ueg65xd032` + `cbx.nwfqpcs1nen2` | Intermittent grey backdrop behind the context-sheet blur (G19): NOT reproducible on the emulator in either theme (blur renders correctly over deck/empty/dark) — real-device dimezis snapshot behaviour. Candidates to try live on the phone: drop `blurMethod="dimezisBlurView"` (plain translucency, no blur), an opaque themed underlay behind the BlurView, or remove the BlurView and keep only the wash | Finn, 2026-08-17 |

## Standing notes

- Native build (expo-clipboard for one-tap snapshot copy): approved "yes but
  no rush" — fold into the next scheduled native build/runtime bump.
