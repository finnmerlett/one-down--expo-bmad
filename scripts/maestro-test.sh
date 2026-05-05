#!/bin/bash
# Maestro E2E test runner with app log capture.
# Usage: ./scripts/maestro-test.sh [maestro test args...]
# Example: ./scripts/maestro-test.sh .maestro/03-story-1-2-quick-add-smoke.yaml

set -o pipefail
export PATH="$PATH:$HOME/.maestro/bin"

# Check for connected device/emulator
DEVICE_COUNT=$(adb devices 2>/dev/null | grep -cw "device")
if [[ "$DEVICE_COUNT" -eq 0 ]]; then
  echo "ERROR: No Android device/emulator connected."
  echo "Start one in a background terminal session with (eg.):"
  echo "~/Library/Android/sdk/emulator/emulator @Pixel_8_API_35 -no-window -no-audio &"
  exit 1
fi

# Clear logcat before the test
adb logcat -c

# Run maestro test, passing all arguments through
maestro test "$@"
MAESTRO_EXIT=$?

# Dump filtered app logs
echo ""
echo "=== APP LOGS (ReactNativeJS) ==="
adb logcat -d -s ReactNativeJS:I | grep -v 'Running "main"'
echo "================================"

exit $MAESTRO_EXIT
