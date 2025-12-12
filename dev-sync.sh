#!/bin/bash

# Keyframe Nudger Development Sync Script
# Creates symbolic link for development

EXTENSION_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
SYMLINK_NAME="keyframe-nudger-dev"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔗 Setting up Keyframe Nudger development environment..."

# Create extensions directory if it doesn't exist
mkdir -p "$EXTENSION_DIR"

# Remove existing symlink if present
if [ -L "$EXTENSION_DIR/$SYMLINK_NAME" ]; then
    echo "📝 Removing existing symlink..."
    rm "$EXTENSION_DIR/$SYMLINK_NAME"
fi

# Create new symlink
echo "🔗 Creating symlink: $EXTENSION_DIR/$SYMLINK_NAME -> $SOURCE_DIR"
ln -s "$SOURCE_DIR" "$EXTENSION_DIR/$SYMLINK_NAME"

echo "✅ Development environment ready!"
echo "📌 Please restart After Effects to see changes"
echo "🎯 Extension will appear as 'Keyframe Nudger Dev' in Window > Extensions"
