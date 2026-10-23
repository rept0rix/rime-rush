#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RIME RUSH - Automated Android Release Pipeline (Google Play App Bundle - AAB)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$DIR/android"
BUNDLE_OUTPUT="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

echo "=================================================="
echo "🤖 Starting Android Release Pipeline for RIME RUSH"
echo "=================================================="

# 1. Check Java 17/21 compatibility
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

echo "☕ Using Java: $(java -version 2>&1 | head -n 1)"

# 2. Check keystore and properties
if [ ! -f "$ANDROID_DIR/keystore.properties" ]; then
  echo "❌ Error: Missing $ANDROID_DIR/keystore.properties"
  exit 1
fi

if [ ! -f "$ANDROID_DIR/rimerush-upload.keystore" ]; then
  echo "❌ Error: Missing $ANDROID_DIR/rimerush-upload.keystore"
  exit 1
fi

# 3. Clean and Build Release App Bundle (.aab)
echo "📦 Building signed release bundle (AAB) with Gradle..."
cd "$ANDROID_DIR"
./gradlew clean bundleRelease

if [ ! -f "$BUNDLE_OUTPUT" ]; then
  echo "❌ Error: Expected bundle not found at $BUNDLE_OUTPUT"
  exit 1
fi

# 4. Copy to convenient release location
RELEASE_DEST="$DIR/android/RimeRush-release.aab"
cp "$BUNDLE_OUTPUT" "$RELEASE_DEST"

FILE_SIZE=$(ls -lh "$RELEASE_DEST" | awk '{print $5}')
SHA256_HASH=$(shasum -a 256 "$RELEASE_DEST" | awk '{print $1}')

echo ""
echo "=================================================="
echo "🎉 ANDROID RELEASE BUNDLE READY FOR GOOGLE PLAY!"
echo "=================================================="
echo "📍 Location: $RELEASE_DEST"
echo "📏 Size:     $FILE_SIZE"
echo "🔑 SHA-256:  $SHA256_HASH"
echo ""
echo "🚀 Next step in Google Play Console:"
echo "   1. Open https://play.google.com/console"
echo "   2. Select 'Rime Rush' -> Production (or Closed testing)"
echo "   3. Create new release -> Drag & drop: RimeRush-release.aab"
echo "=================================================="
