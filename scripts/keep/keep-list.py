#!/usr/bin/env python3
"""Bridge to Finn's Google Keep fix-list (Story 9.6).

The Keep list is where app fixes/edits get jotted on the go. Workflow:
on request, `pull` the items and mirror the unchecked ones into the current
fixes story; once a fix ships to the phone via OTA, `check` its item so the
list stays truthful.

Commands (run with scripts/keep/.venv/bin/python):
  pull                 print every item: `[ ] <id>  <text>` (unchecked first)
  check <id> [...]     tick item(s) by the id shown by pull, then sync
  uncheck <id> [...]   untick item(s), then sync
  add <text>           append a new unchecked item to the list, then sync

Config from the repo-root .env (gitignored):
  GOOGLE_KEEP_EMAIL         account that owns the list
  GOOGLE_KEEP_MASTER_TOKEN  from scripts/keep/get-master-token.py
  GOOGLE_KEEP_LIST_ID       the id from the keep.google.com/#LIST/<id> URL
"""

import os
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


def load_root_env() -> None:
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"{name} is not set — add it to the repo-root .env (see script docstring).")
    return value


def get_keep():
    import gkeepapi

    token = require("GOOGLE_KEEP_MASTER_TOKEN")
    if token.startswith("oauth2_4/"):
        sys.exit(
            "GOOGLE_KEEP_MASTER_TOKEN holds the EmbeddedSetup oauth_token cookie, "
            "not a master token — run scripts/keep/get-master-token.py to exchange "
            "it (master tokens start with aas_et/)."
        )
    keep = gkeepapi.Keep()
    keep.authenticate(require("GOOGLE_KEEP_EMAIL"), token)
    return keep


def get_list(keep):
    list_id = require("GOOGLE_KEEP_LIST_ID")
    node = keep.get(list_id)
    if node is None:
        # keep.get() indexes by internal id; the URL carries the server id.
        node = next(
            (n for n in keep.all() if getattr(n, "server_id", None) == list_id),
            None,
        )
    if node is None:
        sys.exit(f"List {list_id!r} not found in this account's Keep data.")
    return node


def cmd_pull() -> None:
    keep = get_keep()
    note = get_list(keep)
    print(f"# {note.title}")
    items = sorted(note.items, key=lambda i: i.checked)
    for item in items:
        mark = "x" if item.checked else " "
        print(f"[{mark}] {item.id}  {item.text}")


def cmd_set_checked(ids: list[str], checked: bool) -> None:
    keep = get_keep()
    note = get_list(keep)
    by_id = {item.id: item for item in note.items}
    for item_id in ids:
        item = by_id.get(item_id)
        if item is None:
            sys.exit(f"Item {item_id!r} not found — run `pull` for current ids.")
        item.checked = checked
        print(f"[{'x' if checked else ' '}] {item.text}")
    keep.sync()


def cmd_add(text: str) -> None:
    keep = get_keep()
    note = get_list(keep)
    note.add(text, False)
    keep.sync()
    print(f"[ ] {text}")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    command, rest = args[0], args[1:]
    load_root_env()
    if command == "pull":
        cmd_pull()
    elif command == "check" and rest:
        cmd_set_checked(rest, True)
    elif command == "uncheck" and rest:
        cmd_set_checked(rest, False)
    elif command == "add" and rest:
        cmd_add(" ".join(rest))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
