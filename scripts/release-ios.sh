#!/usr/bin/env bash
set -euo pipefail

ASC_CONFIG="$HOME/.private_keys/app-store-connect.env"
if [ -f "$ASC_CONFIG" ]; then
  # Keep the private .p8 key outside the repository; load only its local key IDs.
  source "$ASC_CONFIG"
fi

# ==============================================================================
# RIME RUSH - Automated iOS Build & App Store Connect Release Script
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$DIR/ios"
BUILD_DIR="$IOS_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/RimeRush.xcarchive"
EXPORT_PATH="$BUILD_DIR/output"
EXPORT_OPTIONS="$IOS_DIR/ExportOptions.plist"

cd "$IOS_DIR"

echo "=================================================="
echo "🚀 Starting iOS Release Pipeline for RIME RUSH"
echo "=================================================="

# 1. Generate Xcode project
echo "🛠️  Generating Xcode project with XcodeGen..."
xcodegen generate

# Clean previous build artifacts
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$EXPORT_PATH"

# 2. Archive
echo "📦 Archiving RimeRush (Release configuration)..."
xcodebuild \
  -project RimeRush.xcodeproj \
  -scheme RimeRush \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  -allowProvisioningUpdates

echo "✅ Archive created at: $ARCHIVE_PATH"

# 3. Export IPA
echo "📤 Exporting IPA for App Store Connect..."
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates

IPA_FILE="$EXPORT_PATH/RimeRush.ipa"
if [ ! -f "$IPA_FILE" ]; then
  # Sometimes the exported ipa has target name
  IPA_FILE="$(find "$EXPORT_PATH" -name "*.ipa" | head -n 1)"
fi

echo "🎉 IPA successfully created at: $IPA_FILE"

# 4. Upload to App Store Connect / TestFlight if credentials provided
UPLOAD="${1:-}"
if [ "$UPLOAD" = "--upload" ] || [ -n "${APP_STORE_CONNECT_KEY_ID:-}" ]; then
  KEY_ID="${APP_STORE_CONNECT_KEY_ID:-}"
  ISSUER_ID="${APP_STORE_CONNECT_ISSUER_ID:-}"

  if [ -z "$KEY_ID" ] || [ -z "$ISSUER_ID" ]; then
    echo "⚠️  Missing APP_STORE_CONNECT_KEY_ID or APP_STORE_CONNECT_ISSUER_ID."
    echo "To upload automatically, export:"
    echo "  export APP_STORE_CONNECT_KEY_ID=\"XXXXXXXXXX\""
    echo "  export APP_STORE_CONNECT_ISSUER_ID=\"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\""
    echo "And ensure AuthKey_\$APP_STORE_CONNECT_KEY_ID.p8 is in ~/.private_keys/"
    exit 1
  fi

  echo "🚀 Uploading $IPA_FILE to App Store Connect / TestFlight..."
  xcrun altool --upload-app \
    -f "$IPA_FILE" \
    -t ios \
    --apiKey "$KEY_ID" \
    --apiIssuer "$ISSUER_ID"

  echo "✅ Upload completed successfully to TestFlight!"
else
  echo ""
  echo "ℹ️  To upload this IPA to TestFlight, run:"
  echo "   bash scripts/release-ios.sh --upload"
  echo "Or use Apple Transporter app to drag and drop: $IPA_FILE"
fi
