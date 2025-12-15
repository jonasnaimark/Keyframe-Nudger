// Keyframe Nudger - Standalone keyframe manipulation tool
// Extracted from AirBoard

// Debug utilities
const DEBUG = {
    log: (msg, data) => console.log(`🎬 KeyframeNudger: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ KeyframeNudger Error: ${msg}`, error),
    info: (msg, data) => console.info(`ℹ️ KeyframeNudger: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`⚠️ KeyframeNudger Warning: ${msg}`, data || '')
};

// Add debug panel to the extension UI
window.addDebugPanel = () => {
    if (document.getElementById('debug-panel')) return; // Already exists

    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        background: #1a1a1a;
        border: 2px solid #3498db;
        border-radius: 6px;
        padding: 8px;
        font-size: 10px;
        color: #ccc;
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        font-family: monospace;
    `;

    debugPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px; user-select: none; color: #3498db;">
            🐛 Layer In/Out Point Debug
        </div>
        <div style="font-size: 8px; color: #888; margin-bottom: 5px; user-select: none;">
            Showing: IN/OUT TRACK, IN/OUT UPDATE messages
        </div>
        <div id="debug-log" style="
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            font-family: monospace;
            font-size: 9px;
            line-height: 1.3;
        "></div>
        <div style="margin-top: 6px; user-select: none;">
            <button onclick="document.getElementById('debug-log').innerHTML = ''" style="
                background: #444;
                border: 1px solid #666;
                color: #ccc;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 8px;
                margin-right: 4px;
                cursor: pointer;
            ">Clear</button>
            <button onclick="navigator.clipboard && navigator.clipboard.writeText(document.getElementById('debug-log').innerText)" style="
                background: #444;
                border: 1px solid #666;
                color: #ccc;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 8px;
                margin-right: 4px;
                cursor: pointer;
            ">Copy</button>
            <button onclick="document.getElementById('debug-panel').remove()" style="
                background: #666;
                border: 1px solid #888;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 8px;
                cursor: pointer;
            ">Close</button>
        </div>
    `;

    document.body.appendChild(debugPanel);

    // Redirect console.log to debug panel - FILTERED for layer in/out debugging
    const originalLog = console.log;
    console.log = (...args) => {
        originalLog(...args);
        const message = args.join(' ');

        // Only show IN/OUT TRACK, IN/OUT UPDATE, PASTE, and CLIPBOARD debug messages
        const debugKeywords = [
            'IN/OUT TRACK:',
            'IN/OUT UPDATE:',
            'PASTE:',
            'CLIPBOARD:'
        ];

        const isInOutDebug = debugKeywords.some(keyword => message.includes(keyword));

        if (isInOutDebug) {
            const logDiv = document.getElementById('debug-log');
            if (logDiv) {
                // Color-code different message types
                let color = '#ccc';
                if (message.includes('IN/OUT TRACK:')) color = '#e74c3c';  // Red for tracking
                if (message.includes('IN/OUT UPDATE:')) color = '#2ecc71'; // Green for updates
                if (message.includes('Setting')) color = '#f39c12';  // Orange for actual updates
                if (message.includes('PASTE:')) color = '#3498db';  // Blue for paste
                if (message.includes('CLIPBOARD:')) color = '#9b59b6';  // Purple for clipboard

                logDiv.innerHTML += `<div style="
                    margin: 1px 0;
                    font-size: 9px;
                    padding: 1px 0;
                    user-select: text;
                    -webkit-user-select: text;
                    word-wrap: break-word;
                    color: ${color};
                ">${message}</div>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }
        }
    };
};

// Helper functions to show/hide position rows
function hidePositionRow(axis) {
    var row = document.getElementById(axis + 'DistanceRow');
    if (row && row.classList.contains('visible')) {
        row.classList.remove('visible');
        updateStaggerMargin();
    }
}

function showPositionRow(axis) {
    var row = document.getElementById(axis + 'DistanceRow');
    if (row && !row.classList.contains('visible')) {
        row.classList.add('visible');
        updateStaggerMargin();
    }
}

function updateStaggerMargin() {
    var staggerRow = document.getElementById('staggerRow');
    var xRow = document.getElementById('xDistanceRow');
    var yRow = document.getElementById('yDistanceRow');
    if (staggerRow && xRow && yRow) {
        var bothHidden = !xRow.classList.contains('visible') && !yRow.classList.contains('visible');
        staggerRow.style.marginBottom = bothHidden ? '0' : '10px';
    }
}

function showDurationButtons() {
    var durationControls = document.querySelector('#durationDisplay .stagger-controls');
    if (durationControls) durationControls.style.display = 'flex';
}

function showPositionButtons() {
    var xControls = document.querySelector('#xDistanceDisplay .distance-controls');
    var yControls = document.querySelector('#yDistanceDisplay .distance-controls');
    if (xControls) xControls.style.display = 'flex';
    if (yControls) yControls.style.display = 'flex';
}

// Global variable to track cumulative stagger amount
var cumulativeStaggerFrames = 0;

// Function to reset cumulative stagger
function resetCumulativeStagger(isSingleKeyframe) {
    cumulativeStaggerFrames = 0;
    var staggerText = document.getElementById('staggerText');
    if (staggerText) {
        if (isSingleKeyframe) {
            staggerText.innerHTML = 'Stagger';
            staggerText.style.opacity = '0.75';
        } else {
            staggerText.innerHTML = 'Stagger: <span style="opacity: 0.75;">0ms / 0f</span>';
            staggerText.style.opacity = '1';
        }
    }
}

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function() {
    var csInterface;

    try {
        csInterface = new CSInterface();
        DEBUG.log('CSInterface initialized successfully');
    } catch(e) {
        DEBUG.error("CSInterface not available", e);
    }

    // Get button references
    var durationIncrementBtn = document.getElementById('durationIncrementBtn');
    var durationDecrementBtn = document.getElementById('durationDecrementBtn');
    var delayIncrementBtn = document.getElementById('delayIncrementBtn');
    var delayDecrementBtn = document.getElementById('delayDecrementBtn');
    var globalFrameInputField = document.getElementById('globalFrameInput');
    var staggerIncrementBtn = document.getElementById('staggerIncrementBtn');
    var staggerDecrementBtn = document.getElementById('staggerDecrementBtn');
    var staggerActionBtn = document.getElementById('staggerActionBtn');
    var snapToPlayheadBtn = document.getElementById('snapToPlayheadBtn');
    var mirrorKeysBtn = document.getElementById('mirrorKeysBtn');
    var readKeyframesButton = document.getElementById('readKeyframes');

    // Add drag-to-scrub functionality to frame input
    if (globalFrameInputField) {
        var isDragging = false;
        var hasDragged = false;
        var startY = 0;
        var startValue = 0;
        var dragSensitivity = 2; // How many pixels per 1 unit change
        var dragThreshold = 3; // Pixels before drag starts

        globalFrameInputField.addEventListener('mousedown', function(e) {
            isDragging = true;
            hasDragged = false;
            startY = e.clientY;
            startValue = parseInt(globalFrameInputField.value) || 0;
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            var deltaY = startY - e.clientY; // Inverted: drag up = increase

            // Only start scrubbing after threshold
            if (!hasDragged && Math.abs(deltaY) > dragThreshold) {
                hasDragged = true;
                globalFrameInputField.blur(); // Remove focus once dragging starts
            }

            if (!hasDragged) return;

            var changeAmount = Math.round(deltaY / dragSensitivity);
            var newValue = startValue + changeAmount;

            // Clamp to min only
            var min = parseInt(globalFrameInputField.getAttribute('min')) || 1;
            newValue = Math.max(min, newValue);

            // Round to whole number
            newValue = Math.round(newValue);

            globalFrameInputField.value = newValue;
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                hasDragged = false;
            }
        });
    }

    // Frame slider functionality
    var frameSliderHandle = document.getElementById('frameSliderHandle');
    var frameSliderContainer = document.querySelector('.frame-slider-container');
    var frameSliderTrack = document.querySelector('.frame-slider-track');
    var frameSliderMarkers = document.querySelectorAll('.frame-slider-marker');

    if (frameSliderHandle && frameSliderContainer && globalFrameInputField) {
        var sliderSnapPoints = [1, 3, 9, 30, 60, 120];
        var sliderMin = 1;
        var sliderMax = 120;
        var magneticRange = 0.08; // How close to snap point to trigger snapping (as percentage of track)

        // Convert value to position (equal distance between snap points)
        function valueToPosition(value) {
            value = Math.max(sliderMin, Math.min(sliderMax, value));
            // Find which segment the value falls into
            for (var i = 0; i < sliderSnapPoints.length - 1; i++) {
                if (value <= sliderSnapPoints[i + 1]) {
                    var segmentStart = sliderSnapPoints[i];
                    var segmentEnd = sliderSnapPoints[i + 1];
                    var segmentProgress = (value - segmentStart) / (segmentEnd - segmentStart);
                    return (i + segmentProgress) / (sliderSnapPoints.length - 1);
                }
            }
            return 1;
        }

        // Convert position to value (equal distance between snap points)
        function positionToValue(position) {
            position = Math.max(0, Math.min(1, position));
            var segmentIndex = position * (sliderSnapPoints.length - 1);
            var i = Math.floor(segmentIndex);
            if (i >= sliderSnapPoints.length - 1) return sliderSnapPoints[sliderSnapPoints.length - 1];
            var segmentProgress = segmentIndex - i;
            var segmentStart = sliderSnapPoints[i];
            var segmentEnd = sliderSnapPoints[i + 1];
            return segmentStart + segmentProgress * (segmentEnd - segmentStart);
        }

        // Find nearest snap point if within magnetic range
        function applyMagneticSnap(position) {
            for (var i = 0; i < sliderSnapPoints.length; i++) {
                var snapPos = valueToPosition(sliderSnapPoints[i]);
                if (Math.abs(position - snapPos) < magneticRange) {
                    return snapPos;
                }
            }
            return position;
        }

        var padding = 8;

        // Update slider handle position (accounting for padding)
        function updateSliderPosition(value) {
            var position = valueToPosition(value);
            var containerWidth = frameSliderContainer.offsetWidth;
            var trackWidth = containerWidth - (padding * 2);
            var leftPx = padding + (position * trackWidth);
            frameSliderHandle.style.left = leftPx + 'px';
        }

        // Initialize marker positions (accounting for padding)
        function positionMarkers() {
            var containerWidth = frameSliderContainer.offsetWidth;
            var trackWidth = containerWidth - (padding * 2);
            frameSliderMarkers.forEach(function(marker) {
                var value = parseInt(marker.getAttribute('data-value'));
                var position = valueToPosition(value);
                var leftPx = padding + (position * trackWidth);
                marker.style.left = leftPx + 'px';
            });
        }

        // Position markers initially and on resize
        positionMarkers();
        window.addEventListener('resize', function() {
            positionMarkers();
            updateSliderPosition(parseInt(globalFrameInputField.value) || 3);
        });

        frameSliderMarkers.forEach(function(marker) {
            var value = parseInt(marker.getAttribute('data-value'));
            // Click on marker to jump to value
            marker.addEventListener('click', function() {
                globalFrameInputField.value = value;
                updateSliderPosition(value);
            });
            // Add tooltip showing frame number (no delay)
            createTooltip(marker, value.toString(), undefined, 0);
        });

        // Initialize slider position from input
        updateSliderPosition(parseInt(globalFrameInputField.value) || 3);

        // Slider dragging
        var sliderDragging = false;

        frameSliderHandle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            sliderDragging = true;
            frameSliderHandle.classList.add('dragging');
        });

        document.addEventListener('mousemove', function(e) {
            if (!sliderDragging) return;

            var rect = frameSliderContainer.getBoundingClientRect();
            var padding = 8;
            var position = (e.clientX - rect.left - padding) / (rect.width - padding * 2);
            position = Math.max(0, Math.min(1, position));

            // No magnetic snapping - use position directly
            var value = Math.round(positionToValue(position));

            globalFrameInputField.value = value;
            updateSliderPosition(value);
        });

        document.addEventListener('mouseup', function() {
            if (sliderDragging) {
                sliderDragging = false;
                frameSliderHandle.classList.remove('dragging');
            }
        });

        // Click on track to jump to position
        frameSliderTrack.addEventListener('click', function(e) {
            var rect = frameSliderContainer.getBoundingClientRect();
            var padding = 8;
            var position = (e.clientX - rect.left - padding) / (rect.width - padding * 2);
            position = Math.max(0, Math.min(1, position));

            // No magnetic snapping - use position directly
            var value = Math.round(positionToValue(position));

            globalFrameInputField.value = value;
            updateSliderPosition(value);
        });

        // Sync slider when input changes (from scrubbing or typing)
        var originalInputValue = globalFrameInputField.value;
        setInterval(function() {
            var currentValue = globalFrameInputField.value;
            if (currentValue !== originalInputValue) {
                originalInputValue = currentValue;
                var numValue = parseInt(currentValue) || 1;
                // Cap slider position at 120, but allow input to be higher
                updateSliderPosition(Math.min(numValue, sliderMax));
            }
        }, 50);

        // Also listen for input events
        globalFrameInputField.addEventListener('input', function() {
            var numValue = parseInt(globalFrameInputField.value) || 1;
            updateSliderPosition(Math.min(numValue, sliderMax));
        });
    }

    // Global tooltip creation function
    function createTooltip(element, text, position, delay) {
        if (delay === undefined) delay = 500;
        var tooltip = null;
        var showTimeout = null;
        var isShowing = false;
        var showBelow = (position === 'below');

        function removeTooltip() {
            if (showTimeout) {
                clearTimeout(showTimeout);
                showTimeout = null;
            }
            if (tooltip) {
                tooltip.style.opacity = '0';
                setTimeout(function() {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                    isShowing = false;
                }, 200);
            }
        }

        element.addEventListener('mouseenter', function() {
            if (showTimeout) {
                clearTimeout(showTimeout);
            }
            showTimeout = setTimeout(function() {
                tooltip = document.createElement('div');
                tooltip.textContent = text;
                tooltip.style.cssText = `
                    position: fixed;
                    background-color: #1a1a1a;
                    color: #ffffff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 400;
                    white-space: pre;
                    text-align: center;
                    line-height: 1.3;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                `;
                document.body.appendChild(tooltip);
                var rect = element.getBoundingClientRect();
                tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                if (showBelow) {
                    tooltip.style.top = (rect.bottom + 8) + 'px';
                } else {
                    tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
                }
                isShowing = true;
                setTimeout(function() {
                    if (tooltip) tooltip.style.opacity = '1';
                }, 10);
            }, delay);
        });

        element.addEventListener('mouseleave', function() {
            removeTooltip();
        });

        element.addEventListener('mousedown', function() {
            removeTooltip();
        });
    }

    // Setup tooltips - top row buttons show tooltips below to avoid cropping
    if (readKeyframesButton) createTooltip(readKeyframesButton, 'Read keyframes', 'below');
    if (staggerActionBtn) createTooltip(staggerActionBtn, 'Stagger direction', 'below');
    if (snapToPlayheadBtn) createTooltip(snapToPlayheadBtn, 'Snap to playhead\nShift: Collapse delays', 'below');
    if (mirrorKeysBtn) createTooltip(mirrorKeysBtn, 'Mirror keys', 'below');
    if (globalFrameInputField) createTooltip(globalFrameInputField, 'Frames', 'below');
    if (delayDecrementBtn) createTooltip(delayDecrementBtn, 'Alt: 10x multiplier');
    if (delayIncrementBtn) createTooltip(delayIncrementBtn, 'Alt: 10x multiplier');

    // Second row button tooltips - also show below
    var trimInBtn = document.getElementById('trimInBtn');
    var trimOutBtn = document.getElementById('trimOutBtn');
    var copyKeysBtn = document.getElementById('copyKeysBtn');
    var pasteKeysBtn = document.getElementById('pasteKeysBtn');
    if (trimInBtn) createTooltip(trimInBtn, 'Trim in-point\nShift: Min in-point', 'below');
    if (trimOutBtn) createTooltip(trimOutBtn, 'Trim out-point\nShift: Max out-point', 'below');
    if (copyKeysBtn) createTooltip(copyKeysBtn, 'Copy keys', 'below');
    if (pasteKeysBtn) createTooltip(pasteKeysBtn, 'Paste keys', 'below');

    // In/Out button tooltips
    var xInBtn = document.getElementById('xInBtn');
    var xOutBtn = document.getElementById('xOutBtn');
    var yInBtn = document.getElementById('yInBtn');
    var yOutBtn = document.getElementById('yOutBtn');
    if (xInBtn) createTooltip(xInBtn, 'First keyframe');
    if (xOutBtn) createTooltip(xOutBtn, 'Last keyframe');
    if (yInBtn) createTooltip(yInBtn, 'First keyframe');
    if (yOutBtn) createTooltip(yOutBtn, 'Last keyframe');

    // Helper function to handle delay result processing
    function handleDelayResult(result, button) {
        button.disabled = false;
        if (result && result.indexOf('|') !== -1) {
            var parts = result.split('|');
            var status = parts[0];

            // Log all debug messages from JSX (parts 3+ are debug messages)
            if (parts.length > 3) {
                for (var i = 3; i < parts.length; i++) {
                    if (parts[i]) {
                        console.log(parts[i]);
                    }
                }
            }

            if (status === 'success') {
                var delayMs = parseInt(parts[1]);
                var delayFrames = parseInt(parts[2]);
                var delayText = document.getElementById('delayText');
                if (delayMs === -1) {
                    delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">Multiple</span>';
                } else {
                    delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">' + delayMs + 'ms / ' + delayFrames + 'f</span>';
                }
                delayText.style.opacity = '1';
            } else if (status === 'error') {
                var delayText = document.getElementById('delayText');
                delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">0ms / 0f</span>';
                delayText.style.opacity = '1';
            }
        }
    }

    // Helper function to update distance display
    function updateDistanceDisplay(axis, result) {
        var textElement = document.getElementById(axis + 'DistanceText');
        if (result && result.indexOf('|') !== -1) {
            var parts = result.split('|');
            var status = parts[0];
            if (status === 'success') {
                var distance = parseFloat(parts[1]);
                var hasDistance = parts[2] === '1';
                var resolutionMultiplier = 2; // Default 2x
                if (hasDistance) {
                    if (distance === -999999) {
                        textElement.innerHTML = axis.toUpperCase() + ': <span style="opacity: 0.75;">Multiple</span>';
                    } else {
                        var scaledDistance = parseFloat((distance / resolutionMultiplier).toFixed(2));
                        if (scaledDistance === 0) {
                            textElement.innerHTML = axis.toUpperCase() + ': <span style="opacity: 0.75;">0px @1x</span>';
                        } else {
                            var direction = '';
                            var absScaledDistance = Math.abs(scaledDistance);
                            if (axis === 'x') {
                                direction = scaledDistance > 0 ? 'Right' : 'Left';
                            } else {
                                direction = scaledDistance > 0 ? 'Down' : 'Up';
                            }
                            textElement.innerHTML = axis.toUpperCase() + ': <span style="opacity: 0.75;">' + direction + ' ' + absScaledDistance + 'px @1x</span>';
                        }
                    }
                    textElement.style.opacity = '1';
                }
            }
        }
    }

    // Handle read keyframes
    function handleReadKeyframes(updatePositionRows) {
        if (updatePositionRows === undefined) updatePositionRows = true;

        var durationText = document.getElementById('durationText');
        var delayText = document.getElementById('delayText');
        var xDistanceText = document.getElementById('xDistanceText');
        var yDistanceText = document.getElementById('yDistanceText');
        var staggerText = document.getElementById('staggerText');

        // Reset displays
        durationText.textContent = 'Duration';
        durationText.style.opacity = '0.75';
        delayText.textContent = 'Delay';
        delayText.style.opacity = '0.75';
        xDistanceText.textContent = 'X distance';
        xDistanceText.style.opacity = '0.75';
        yDistanceText.textContent = 'Y distance';
        yDistanceText.style.opacity = '0.75';
        staggerText.textContent = 'Stagger';
        staggerText.style.opacity = '0.75';
        cumulativeStaggerFrames = 0;

        if (!csInterface) return;

        csInterface.evalScript('readKeyframesSmart()', function(result) {
            if (result && result.indexOf('|') !== -1) {
                var parts = result.split('|');
                var status = parts[0];

                if (status === 'error') {
                    durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">0ms / 0f</span>';
                    delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">0ms / 0f</span>';
                    staggerText.innerHTML = 'Stagger: <span style="opacity: 0.75;">0ms / 0f</span>';
                    durationText.style.opacity = '1';
                    delayText.style.opacity = '1';
                    staggerText.style.opacity = '1';
                    if (updatePositionRows) {
                        hidePositionRow('x');
                        hidePositionRow('y');
                    }
                } else if (status === 'success') {
                    var isCrossPropertyMode = parts.length > 10 && parts[10] === '1';
                    var delayMs, delayFrames, durationMs, durationFrames;
                    var xDistance, yDistance, hasXDistance, hasYDistance;
                    var staggerValue = "Stagger";

                    if (isCrossPropertyMode) {
                        delayMs = parseInt(parts[1]);
                        delayFrames = parseInt(parts[2]);
                        durationMs = parseInt(parts[3]);
                        durationFrames = parseInt(parts[4]);
                        xDistance = parts.length > 6 ? parseInt(parts[6]) : 0;
                        yDistance = parts.length > 7 ? parseInt(parts[7]) : 0;
                        hasXDistance = parts.length > 8 ? (parts[8] === '1') : false;
                        hasYDistance = parts.length > 9 ? (parts[9] === '1') : false;
                        staggerValue = parts.length > 11 ? parts[11] : "Stagger";
                    } else {
                        durationMs = parseInt(parts[1]);
                        durationFrames = parseInt(parts[2]);
                        delayMs = 0;
                        delayFrames = 0;
                        xDistance = parts.length > 6 ? parseInt(parts[6]) : 0;
                        yDistance = parts.length > 7 ? parseInt(parts[7]) : 0;
                        hasXDistance = parts.length > 8 ? (parts[8] === '1') : false;
                        hasYDistance = parts.length > 9 ? (parts[9] === '1') : false;
                        staggerValue = parts.length > 11 ? parts[11] : "Stagger";
                    }

                    // Update duration display
                    if (durationMs === -1) {
                        durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">Multiple</span>';
                    } else if (durationMs === -999 || durationMs === 0) {
                        durationText.innerHTML = 'Duration';
                        durationText.style.opacity = '0.75';
                    } else {
                        durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">' + durationMs + 'ms / ' + durationFrames + 'f</span>';
                        durationText.style.opacity = '1';
                    }

                    // Update delay display
                    if (isCrossPropertyMode) {
                        if (delayMs === -1) {
                            delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">Multiple</span>';
                        } else if (durationMs === -999) {
                            delayText.innerHTML = 'Delay';
                            delayText.style.opacity = '0.75';
                        } else {
                            delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">' + delayMs + 'ms / ' + delayFrames + 'f</span>';
                        }
                        delayText.style.opacity = '1';
                    } else {
                        delayText.innerHTML = 'Delay: <span style="opacity: 0.75;">0ms / 0f</span>';
                        delayText.style.opacity = '1';
                    }

                    // Update stagger display
                    var staggerTextElement = document.getElementById('staggerText');
                    if (staggerTextElement) {
                        if (staggerValue === "Stagger") {
                            var isSingleLayerCrossProperty = result.indexOf("across 1 layers") !== -1;
                            if (durationMs === -999 || isSingleLayerCrossProperty) {
                                staggerTextElement.innerHTML = 'Stagger';
                                staggerTextElement.style.opacity = '0.75';
                                resetCumulativeStagger(true);
                            } else {
                                staggerTextElement.innerHTML = 'Stagger: <span style="opacity: 0.75;">0ms / 0f</span>';
                                staggerTextElement.style.opacity = '1';
                                resetCumulativeStagger(false);
                            }
                        } else if (staggerValue === "Multiple") {
                            staggerTextElement.innerHTML = 'Stagger: <span style="opacity: 0.75;">Multiple</span>';
                            staggerTextElement.style.opacity = '1';
                        } else {
                            staggerTextElement.innerHTML = 'Stagger: <span style="opacity: 0.75;">' + staggerValue + '</span>';
                            staggerTextElement.style.opacity = '1';
                        }
                    }

                    showDurationButtons();
                    showPositionButtons();

                    // Update X/Y distance displays
                    var resolutionMultiplier = 2;
                    if (hasXDistance) {
                        if (updatePositionRows) showPositionRow('x');
                        if (xDistance === -999999) {
                            xDistanceText.innerHTML = 'X: <span style="opacity: 0.75;">Multiple</span>';
                        } else {
                            var scaledX = parseFloat((xDistance / resolutionMultiplier).toFixed(2));
                            if (scaledX === 0) {
                                xDistanceText.innerHTML = 'X: <span style="opacity: 0.75;">0px @1x</span>';
                            } else {
                                var dir = scaledX > 0 ? 'Right' : 'Left';
                                xDistanceText.innerHTML = 'X: <span style="opacity: 0.75;">' + dir + ' ' + Math.abs(scaledX) + 'px @1x</span>';
                            }
                        }
                        xDistanceText.style.opacity = '1';
                    } else if (updatePositionRows) {
                        hidePositionRow('x');
                    }

                    if (hasYDistance) {
                        if (updatePositionRows) showPositionRow('y');
                        if (yDistance === -999999) {
                            yDistanceText.innerHTML = 'Y: <span style="opacity: 0.75;">Multiple</span>';
                        } else {
                            var scaledY = parseFloat((yDistance / resolutionMultiplier).toFixed(2));
                            if (scaledY === 0) {
                                yDistanceText.innerHTML = 'Y: <span style="opacity: 0.75;">0px @1x</span>';
                            } else {
                                var dir = scaledY > 0 ? 'Down' : 'Up';
                                yDistanceText.innerHTML = 'Y: <span style="opacity: 0.75;">' + dir + ' ' + Math.abs(scaledY) + 'px @1x</span>';
                            }
                        }
                        yDistanceText.style.opacity = '1';
                    } else if (updatePositionRows) {
                        hidePositionRow('y');
                    }
                }
            }
        });
    }

    // Read Keyframes button
    if (readKeyframesButton) {
        readKeyframesButton.addEventListener('click', function() {
            handleReadKeyframes();
        });
    }

    // Duration buttons
    if (durationIncrementBtn && durationDecrementBtn && globalFrameInputField) {
        durationIncrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var durationFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) durationFrames *= 10;
            durationIncrementBtn.disabled = true;
            csInterface.evalScript('stretchKeyframesWithFrames(1, ' + durationFrames + ')', function(result) {
                durationIncrementBtn.disabled = false;
                if (result && result.indexOf('|') !== -1) {
                    var parts = result.split('|');
                    if (parts[0] === 'success') {
                        var durationMs = parseInt(parts[1]);
                        var durationFrames = parseInt(parts[2]);
                        var durationText = document.getElementById('durationText');
                        if (durationMs === -1) {
                            durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">Multiple</span>';
                        } else {
                            durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">' + durationMs + 'ms / ' + durationFrames + 'f</span>';
                        }
                        durationText.style.opacity = '1';
                    }
                }
            });
        });

        durationDecrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var durationFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) durationFrames *= 10;
            durationDecrementBtn.disabled = true;
            csInterface.evalScript('stretchKeyframesWithFrames(-1, ' + durationFrames + ')', function(result) {
                durationDecrementBtn.disabled = false;
                if (result && result.indexOf('|') !== -1) {
                    var parts = result.split('|');
                    if (parts[0] === 'success') {
                        var durationMs = parseInt(parts[1]);
                        var durationFrames = parseInt(parts[2]);
                        var durationText = document.getElementById('durationText');
                        if (durationMs === -1) {
                            durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">Multiple</span>';
                        } else {
                            durationText.innerHTML = 'Duration: <span style="opacity: 0.75;">' + durationMs + 'ms / ' + durationFrames + 'f</span>';
                        }
                        durationText.style.opacity = '1';
                    }
                }
            });
        });
    }

    // Delay buttons
    if (delayIncrementBtn && delayDecrementBtn && globalFrameInputField) {
        delayIncrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var delayFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) delayFrames *= 10;
            delayIncrementBtn.disabled = true;
            csInterface.evalScript('nudgeDelayTimelineMode(1, ' + delayFrames + ')', function(result) {
                handleDelayResult(result, delayIncrementBtn);
            });
        });

        delayDecrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var delayFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) delayFrames *= 10;
            delayDecrementBtn.disabled = true;
            csInterface.evalScript('nudgeDelayTimelineMode(-1, ' + delayFrames + ')', function(result) {
                handleDelayResult(result, delayDecrementBtn);
            });
        });
    }

    // Stagger buttons
    if (staggerIncrementBtn) {
        staggerIncrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var staggerFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) staggerFrames *= 10;
            var isTopToBottom = staggerActionBtn && staggerActionBtn.classList.contains('flipped');
            staggerIncrementBtn.disabled = true;
            csInterface.evalScript('applyStagger(1, ' + staggerFrames + ', ' + isTopToBottom + ')', function(result) {
                staggerIncrementBtn.disabled = false;
                setTimeout(function() { handleReadKeyframes(false); }, 100);
            });
        });
    }

    if (staggerDecrementBtn) {
        staggerDecrementBtn.addEventListener('click', function(event) {
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var staggerFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) staggerFrames *= 10;
            var isTopToBottom = staggerActionBtn && staggerActionBtn.classList.contains('flipped');
            staggerDecrementBtn.disabled = true;
            csInterface.evalScript('applyStagger(-1, ' + staggerFrames + ', ' + isTopToBottom + ')', function(result) {
                staggerDecrementBtn.disabled = false;
                setTimeout(function() { handleReadKeyframes(false); }, 100);
            });
        });
    }

    // Stagger direction toggle
    if (staggerActionBtn) {
        staggerActionBtn.addEventListener('click', function() {
            staggerActionBtn.classList.toggle('flipped');
        });
    }

    // Mirror keys
    if (mirrorKeysBtn) {
        mirrorKeysBtn.addEventListener('click', function(event) {
            if (!csInterface) return;
            var preserveDelays = event.shiftKey;
            csInterface.evalScript('mirrorKeysFromPanel(' + preserveDelays + ')', function(result) {
                console.log('Mirror keys result:', result);
            });
        });
    }

    // Snap to playhead
    if (snapToPlayheadBtn) {
        snapToPlayheadBtn.addEventListener('click', function(event) {
            if (!csInterface) return;
            var preserveDelays = !event.shiftKey; // Default: keep delays, Shift: collapse
            csInterface.evalScript('snapToPlayheadFromPanel(' + preserveDelays + ')', function(result) {
                console.log('Snap to playhead result:', result);
            });
        });
    }

    // Trim In Point
    if (trimInBtn) {
        trimInBtn.addEventListener('click', function(event) {
            var isShiftHeld = event.shiftKey;
            console.log('Trim In Point clicked' + (isShiftHeld ? ' [SHIFT - Min In-Point]' : ''));
            if (!csInterface) return;
            csInterface.evalScript('handleTrimInPoint(' + isShiftHeld + ')', function(result) {
                console.log('Trim in point result:', result);
            });
        });
    }

    // Trim Out Point
    if (trimOutBtn) {
        trimOutBtn.addEventListener('click', function(event) {
            var isShiftHeld = event.shiftKey;
            console.log('Trim Out Point clicked' + (isShiftHeld ? ' [SHIFT - Max Out-Point]' : ''));
            if (!csInterface) return;
            csInterface.evalScript('handleTrimOutPoint(' + isShiftHeld + ')', function(result) {
                console.log('Trim out point result:', result);
            });
        });
    }

    // Copy Keys
    if (copyKeysBtn) {
        copyKeysBtn.addEventListener('click', function() {
            if (!csInterface) return;
            csInterface.evalScript('copySelectedKeyframes()', function(result) {
                console.log('Copy keys result:', result);
                // Log debug messages
                if (result && result.indexOf('|') !== -1) {
                    var parts = result.split('|');
                    if (parts.length > 2) {
                        for (var i = 2; i < parts.length; i++) {
                            if (parts[i]) {
                                console.log(parts[i]);
                            }
                        }
                    }
                }

                // Show "Copied!" tooltip if successful
                if (result && result.indexOf('success') === 0) {
                    showCopyTooltip(copyKeysBtn);
                }
            });
        });
    }

    // Show "Copied!" tooltip
    function showCopyTooltip(button) {
        var tooltip = document.createElement('div');
        tooltip.textContent = 'Copied!';
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(30, 80, 50, 0.95);
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 400;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        `;

        // Position below the button
        var rect = button.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        tooltip.style.transform = 'translateX(-50%)';

        document.body.appendChild(tooltip);

        // Fade out and remove
        setTimeout(function() {
            tooltip.style.transition = 'opacity 0.3s';
            tooltip.style.opacity = '0';
            setTimeout(function() {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 300);
        }, 1000);
    }

    // Paste Keys
    if (pasteKeysBtn) {
        pasteKeysBtn.addEventListener('click', function() {
            if (!csInterface) return;
            csInterface.evalScript('pasteKeyframes()', function(result) {
                console.log('Paste keys result:', result);
                // Log debug messages
                if (result && result.indexOf('|') !== -1) {
                    var parts = result.split('|');
                    if (parts.length > 2) {
                        for (var i = 2; i < parts.length; i++) {
                            if (parts[i]) {
                                console.log(parts[i]);
                            }
                        }
                    }
                }
            });
        });
    }

    // X/Y position controls
    function setupPositionControls(axis) {
        var incrementBtn = document.getElementById(axis + 'IncrementBtn');
        var decrementBtn = document.getElementById(axis + 'DecrementBtn');
        var inBtn = document.getElementById(axis + 'InBtn');
        var outBtn = document.getElementById(axis + 'OutBtn');

        // In/Out toggle
        if (inBtn && outBtn) {
            inBtn.addEventListener('click', function() {
                inBtn.classList.add('selected');
                outBtn.classList.remove('selected');
            });
            outBtn.addEventListener('click', function() {
                outBtn.classList.add('selected');
                inBtn.classList.remove('selected');
            });
        }

        if (incrementBtn) {
            incrementBtn.addEventListener('click', function(event) {
                if (!csInterface) return;
                var isInDirection = inBtn && inBtn.classList.contains('selected');
                var direction = isInDirection ? 'in' : 'out';
                var multiplier = event.altKey ? 10 : 1;
                var funcName = axis === 'x' ? 'nudgeXPosition' : 'nudgeYPosition';
                csInterface.evalScript(funcName + '(1, "' + direction + '", ' + multiplier + ')', function(result) {
                    updateDistanceDisplay(axis, result);
                });
            });
        }

        if (decrementBtn) {
            decrementBtn.addEventListener('click', function(event) {
                if (!csInterface) return;
                var isInDirection = inBtn && inBtn.classList.contains('selected');
                var direction = isInDirection ? 'in' : 'out';
                var multiplier = event.altKey ? 10 : 1;
                var funcName = axis === 'x' ? 'nudgeXPosition' : 'nudgeYPosition';
                csInterface.evalScript(funcName + '(-1, "' + direction + '", ' + multiplier + ')', function(result) {
                    updateDistanceDisplay(axis, result);
                });
            });
        }
    }

    setupPositionControls('x');
    setupPositionControls('y');

    // Initialize stagger margin
    updateStaggerMargin();

    // Show all control buttons on load
    setTimeout(function() {
        var durationControls = document.querySelector('#durationDisplay .stagger-controls');
        var delayControls = document.querySelector('#delayDisplay .stagger-controls');
        var xControls = document.querySelector('#xDistanceDisplay .distance-controls');
        var yControls = document.querySelector('#yDistanceDisplay .distance-controls');
        if (durationControls) durationControls.style.display = 'flex';
        if (delayControls) delayControls.style.display = 'flex';
        if (xControls) xControls.style.display = 'flex';
        if (yControls) yControls.style.display = 'flex';
    }, 100);
});
