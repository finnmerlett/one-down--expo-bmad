#!/usr/bin/env bash
# Runs Maestro E2E flows against the installed release APK, then dumps the
# app's console output (ReactNativeJS logcat) so failures are debuggable.
# Usage: ./scripts/maestro-test.sh [flow-file-or-directory] (default: .maestro/)
set -uo pipefail

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
TARGET="${1:-.maestro/}"

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "ERROR: no Android device/emulator connected (adb get-state failed)." >&2
  echo "Start one with: ~/Library/Android/sdk/emulator/emulator @Pixel_8_API_35 -no-window -no-audio &" >&2
  exit 1
fi

"$ADB" logcat -c || true

maestro test "$TARGET"
status=$?

echo ""
echo "--- app console logs (ReactNativeJS) ---"
"$ADB" logcat -d -s ReactNativeJS || true

exit "$status"
