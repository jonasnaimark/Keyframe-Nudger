#!/bin/bash

# Keyframe Nudger Build Script
# Creates signed ZXP package for distribution

VERSION="1.0.0"
EXTENSION_NAME="KeyframeNudger"
BUNDLE_ID="com.keyframenudger.panel"

# Directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
ZXP_FILE="$DIST_DIR/$EXTENSION_NAME-v$VERSION.zxp"
CERT_FILE="$SCRIPT_DIR/new-cert.p12"
CERT_PASSWORD="keyframenudger123"

echo "🔨 Building Keyframe Nudger v$VERSION..."

# Create dist directory
mkdir -p "$DIST_DIR"

# Check if certificate exists
if [ ! -f "$CERT_FILE" ]; then
    echo "⚠️  Certificate not found. Creating self-signed certificate..."
    # Create a self-signed certificate
    ./ZXPSignCmd -selfSignedCert US California "Keyframe Nudger" "Keyframe Nudger" "$CERT_PASSWORD" "$CERT_FILE"
fi

# Remove old ZXP if exists
if [ -f "$ZXP_FILE" ]; then
    rm "$ZXP_FILE"
fi

# Check for ZXPSignCmd
ZXPSIGNCMD=""
if [ -f "$SCRIPT_DIR/ZXPSignCmd" ]; then
    ZXPSIGNCMD="$SCRIPT_DIR/ZXPSignCmd"
elif command -v ZXPSignCmd &> /dev/null; then
    ZXPSIGNCMD="ZXPSignCmd"
else
    echo "❌ ZXPSignCmd not found!"
    echo "   Please download from: https://github.com/nicholaseduard/ZXPSignCMD/releases"
    echo "   And place in: $SCRIPT_DIR/"
    exit 1
fi

echo "📦 Creating ZXP package..."

# Create temporary build directory (excluding dev files)
BUILD_TMP="$SCRIPT_DIR/.build_tmp"
rm -rf "$BUILD_TMP"
mkdir -p "$BUILD_TMP"

# Copy files to build directory
cp -R "$SCRIPT_DIR/CSXS" "$BUILD_TMP/"
cp -R "$SCRIPT_DIR/client" "$BUILD_TMP/"
cp -R "$SCRIPT_DIR/jsx" "$BUILD_TMP/"

# Update manifest for production (change .dev to production ID)
sed -i '' 's/com.keyframenudger.panel.dev/com.keyframenudger.panel/g' "$BUILD_TMP/CSXS/manifest.xml"
sed -i '' 's/Keyframe Nudger Dev/Keyframe Nudger/g' "$BUILD_TMP/CSXS/manifest.xml"

# Sign the package
"$ZXPSIGNCMD" -sign "$BUILD_TMP" "$ZXP_FILE" "$CERT_FILE" "$CERT_PASSWORD"

# Cleanup
rm -rf "$BUILD_TMP"

if [ -f "$ZXP_FILE" ]; then
    echo "✅ Build complete!"
    echo "📦 ZXP file: $ZXP_FILE"
    echo ""
    echo "To install:"
    echo "  1. Open Anastasiy's Extension Manager or ZXP Installer"
    echo "  2. Install: $ZXP_FILE"
    echo "  3. Restart After Effects"
else
    echo "❌ Build failed!"
    exit 1
fi
