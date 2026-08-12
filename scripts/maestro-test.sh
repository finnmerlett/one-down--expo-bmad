#!/usr/bin/env bash
# Runs Maestro E2E flows against the installed release APK, then dumps the
# app's console output (ReactNativeJS logcat) so failures are debuggable.
# Usage: ./scripts/maestro-test.sh [flow-file-or-directory] (default: .maestro/)
set -uo pipefail

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
TARGET="${1:-.maestro/}"

# Pin every adb/maestro call to one device so a second attached device (e.g. a
# physical phone over USB) can never be targeted. Defaults to the first
# running emulator; override by exporting ANDROID_SERIAL.
if [ -z "${ANDROID_SERIAL:-}" ]; then
  ANDROID_SERIAL="$("$ADB" devices | awk '/^emulator-[0-9]+[[:space:]]+device$/ { print $1; exit }')"
fi
if [ -z "$ANDROID_SERIAL" ]; then
  echo "ERROR: no running emulator found (and ANDROID_SERIAL is unset)." >&2
  echo "Start one with: ~/Library/Android/sdk/emulator/emulator @Pixel_8_API_35 -no-window -no-audio &" >&2
  exit 1
fi
export ANDROID_SERIAL

if ! "$ADB" -s "$ANDROID_SERIAL" get-state >/dev/null 2>&1; then
  echo "ERROR: device $ANDROID_SERIAL is not connected (adb get-state failed)." >&2
  exit 1
fi

# Reseed the per-flow e2e fixture accounts (9-5 item 1) so every run starts
# from pristine server state — earlier runs push mutations into the accounts.
# Requires supabase-local (:54321/:54322). SKIP_E2E_SEED=1 to bypass.
if [ -z "${SKIP_E2E_SEED:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if ! (cd "$SCRIPT_DIR/.." && bun run seed:e2e); then
    echo "ERROR: e2e account seeding failed (is the supabase-local stack running?)." >&2
    echo "       Bypass with SKIP_E2E_SEED=1 if you know the accounts are fresh." >&2
    exit 1
  fi
fi

"$ADB" -s "$ANDROID_SERIAL" logcat -c || true

# Maestro/dadb quirk: when ANY extra device is attached to the adb server
# (e.g. an unauthorized physical phone over USB), Maestro's Android discovery
# collapses to "0 devices connected" — dadb lists every adb-server device and
# a single failing shell call (unauthorized => all commands fail) wipes the
# whole list (runCatching around the full map in DeviceService.kt).
# Workaround for emulator targets: kill the adb server and hide the adb
# binary from Maestro's JVM, so dadb falls back to direct-TCP emulator
# discovery (localhost:5555..) which physically cannot see USB devices. The
# emulator's dadb id on that path is "localhost:<console port + 1>".
case "$ANDROID_SERIAL" in
  emulator-*)
    CONSOLE_PORT="${ANDROID_SERIAL#emulator-}"
    DADB_ID="localhost:$((CONSOLE_PORT + 1))"
    "$ADB" kill-server >/dev/null 2>&1 || true
    env -u ANDROID_HOME -u ANDROID_SDK_ROOT \
      PATH="$HOME/.maestro/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
      maestro test --device "$DADB_ID" "$TARGET"
    status=$?
    ;;
  *)
    maestro test --device "$ANDROID_SERIAL" "$TARGET"
    status=$?
    ;;
esac

echo ""
echo "--- app console logs (ReactNativeJS) ---"
"$ADB" -s "$ANDROID_SERIAL" logcat -d -s ReactNativeJS || true

exit "$status"
