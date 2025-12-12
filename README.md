# Keyframe Nudger

A lightweight, focused After Effects plugin for precise keyframe manipulation. Extracted from AirBoard to provide a standalone tool for keyframe timing and positioning control.

## Features

### Core Keyframe Operations
- **Read Keyframes**: Analyze selected keyframes across multiple layers and properties
- **Duration Control**: Stretch or compress keyframe timing with frame-based precision
- **Delay Control**: Shift keyframes forward/backward on the timeline
- **Stagger**: Offset keyframes across layers or properties with customizable increments
- **Mirror**: Flip keyframe timing around a center point
- **Snap to Playhead**: Move keyframes to current time indicator

### Position Control
- **X/Y Distance Nudging**: Move position keyframes by pixel increments
- **In/Out Point Control**: Target first or last keyframe for position changes
- **Alt Modifier**: 10x multiplier for large adjustments
- **Resolution-aware**: Automatically scales for @1x, @2x display

### Smart Features
- Cross-property analysis (Position, Scale, Rotation, Opacity, etc.)
- Multi-layer keyframe reading
- Easing preservation during duration changes
- Spring marker detection and handling
- Essential Properties support
- Time Remap compatibility

## Installation

### Development Mode
1. Run `./dev-sync.sh` to create a symlink
2. Restart After Effects
3. Access via: Window > Extensions > Keyframe Nudger Dev

### Production Build
1. Run `./build-latest.sh` to create ZXP package
2. Install ZXP using Extension Manager or ZXP Installer
3. Restart After Effects
4. Access via: Window > Extensions > Keyframe Nudger

## Usage

### Quick Start
1. Select keyframes in After Effects timeline
2. Click **Read Keyframes** (magnifying glass icon) to analyze selection
3. Use +/− buttons to adjust timing:
   - **Duration**: Stretch/compress keyframes
   - **Delay**: Move keyframes forward/backward
   - **Stagger**: Offset across layers
4. Adjust **X/Y Distance** for position keyframes

### Keyboard Modifiers
- **Shift**: Special modes (e.g., Delay = ignore precomps, Snap = keep delays)
- **Alt**: 10x multiplier for all operations
- **Frame Input**: Set custom frame increments (default: 3 frames)

### Trim Controls
- **Trim In**: Set work area start to first keyframe
- **Trim Out**: Set work area end to last keyframe
- **Trim In-Out**: Set work area to keyframe range

### Copy/Paste
- **Copy Keys**: Copy selected keyframes to clipboard
- **Paste Keys**: Paste keyframes at playhead

## Technical Details

- **Bundle ID**: `com.keyframenudger.panel`
- **After Effects Compatibility**: CC 2020 - 2025
- **Framework**: CEP (Common Extensibility Platform)
- **Languages**: JavaScript + ExtendScript

## File Structure

```
Keyframe-Nudger/
├── CSXS/
│   └── manifest.xml         # Extension configuration
├── client/
│   ├── index.html           # UI layout
│   ├── css/styles.css       # Styling
│   └── js/
│       ├── CSInterface.js   # Adobe CEP library
│       └── main.js          # Frontend logic
├── jsx/
│   └── main.jsx             # ExtendScript backend
├── dev-sync.sh              # Development setup
└── build-latest.sh          # Production build
```

## Differences from AirBoard

Keyframe Nudger is a focused extraction of AirBoard's keyframe manipulation features:

**Removed from AirBoard:**
- Device mockup templates (iPhone, Desktop)
- Gesture presets (Tap, Long Press, etc.)
- Visual effect presets (Squircles, Shadows, Materials)
- Component library (Loaders, Counters, Logos)
- Project folder setup tools
- File management features

**Retained:**
- All keyframe timing and positioning controls
- Cross-property keyframe analysis
- Easing preservation system
- Spring marker support
- Essential Properties compatibility

## Development

### Prerequisites
- After Effects CC 2020 or later
- macOS (tested) or Windows (should work)
- ZXPSignCmd for building packages

### Quick Development Cycle
1. Make changes to files in `client/` or `jsx/`
2. No rebuild needed - changes are instant via symlink
3. Restart After Effects to see changes
4. Check Console (Chrome DevTools) for debugging

### Building
```bash
./build-latest.sh
```

Creates signed ZXP package in `dist/` folder.

## License

Same as AirBoard (private project).

## Credits

Extracted from **AirBoard** by Jonas Naimark.
