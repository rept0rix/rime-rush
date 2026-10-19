#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/ios"

echo "❄️  Generating iOS project with XcodeGen..."
xcodegen generate

echo "❄️  Building RIME RUSH for iOS (Release)..."
xcodebuild \
  -project RimeRush.xcodeproj \
  -scheme RimeRush \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  clean build

echo "✅ iOS Release build completed successfully!"
echo "👉 To open in Xcode for App Store distribution, run: open ios/RimeRush.xcodeproj"
