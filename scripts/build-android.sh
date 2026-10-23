#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RIME RUSH - Android Build Script (Debug APK / Quick Test)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$DIR/android"

# Detect Java 21 / 17
JAVA_JDK_HOME=""
if [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
  JAVA_JDK_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
  JAVA_JDK_HOME="/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif command -v brew >/dev/null 2>&1 && brew --prefix openjdk@21 >/dev/null 2>&1; then
  JAVA_JDK_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
elif [ -n "${JAVA_HOME:-}" ]; then
  JAVA_JDK_HOME="$JAVA_HOME"
fi

if [ -n "$JAVA_JDK_HOME" ]; then
  export JAVA_HOME="$JAVA_JDK_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "🤖 Building RIME RUSH for Android (Assemble Debug)..."
cd "$ANDROID_DIR"
./gradlew assembleDebug

APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
echo "✅ Debug APK created at: $APK_PATH"
echo "👉 To install directly on a connected Android phone/emulator, run: adb install -r $APK_PATH"
