// Keyframe Nudger - Standalone keyframe manipulation tool
// Extracted from AirBoard

// Debug utilities
const DEBUG = {
    log: (msg, data) => console.log(`🎬 KeyframeNudger: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ KeyframeNudger Error: ${msg}`, error),
    info: (msg, data) => console.info(`ℹ️ KeyframeNudger: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`⚠️ KeyframeNudger Warning: ${msg}`, data || '')
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

    // Global tooltip creation function
    function createTooltip(element, text) {
        var tooltip = null;
        element.addEventListener('mouseenter', function() {
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
                white-space: pre-line;
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
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
            setTimeout(() => tooltip.style.opacity = '1', 10);
        });
        element.addEventListener('mouseleave', function() {
            if (tooltip) {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                }, 200);
            }
        });
    }

    // Setup tooltips
    if (readKeyframesButton) createTooltip(readKeyframesButton, 'Read keyframes');
    if (staggerActionBtn) createTooltip(staggerActionBtn, 'Stagger direction');
    if (snapToPlayheadBtn) createTooltip(snapToPlayheadBtn, 'Snap to playhead\nShift: Keep delays');
    if (mirrorKeysBtn) createTooltip(mirrorKeysBtn, 'Mirror keys');
    if (globalFrameInputField) createTooltip(globalFrameInputField, 'Frames');
    if (delayDecrementBtn) createTooltip(delayDecrementBtn, 'Shift: Ignore precomps');
    if (delayIncrementBtn) createTooltip(delayIncrementBtn, 'Shift: Ignore precomps');

    // Second row button tooltips
    var trimInBtn = document.getElementById('trimInBtn');
    var trimOutBtn = document.getElementById('trimOutBtn');
    var trimInOutBtn = document.getElementById('trimInOutBtn');
    var copyKeysBtn = document.getElementById('copyKeysBtn');
    var pasteKeysBtn = document.getElementById('pasteKeysBtn');
    if (trimInBtn) createTooltip(trimInBtn, 'Trim in point');
    if (trimOutBtn) createTooltip(trimOutBtn, 'Trim out point');
    if (trimInOutBtn) createTooltip(trimInOutBtn, 'Trim in-out point');
    if (copyKeysBtn) createTooltip(copyKeysBtn, 'Copy keys');
    if (pasteKeysBtn) createTooltip(pasteKeysBtn, 'Paste keys');

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
            var isShiftHeld = event.shiftKey;
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var delayFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) delayFrames *= 10;
            delayIncrementBtn.disabled = true;
            var script = isShiftHeld
                ? 'nudgeDelayWithFrames(1, ' + delayFrames + ')'
                : 'nudgeDelayTimelineMode(1, ' + delayFrames + ')';
            csInterface.evalScript(script, function(result) {
                handleDelayResult(result, delayIncrementBtn);
            });
        });

        delayDecrementBtn.addEventListener('click', function(event) {
            var isShiftHeld = event.shiftKey;
            var isAltHeld = event.altKey;
            if (!csInterface) return;
            var delayFrames = parseFloat(globalFrameInputField.value) || 3;
            if (isAltHeld) delayFrames *= 10;
            delayDecrementBtn.disabled = true;
            var script = isShiftHeld
                ? 'nudgeDelayWithFrames(-1, ' + delayFrames + ')'
                : 'nudgeDelayTimelineMode(-1, ' + delayFrames + ')';
            csInterface.evalScript(script, function(result) {
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
            var isShiftHeld = event.shiftKey;
            csInterface.evalScript('snapToPlayheadFromPanel(' + isShiftHeld + ')', function(result) {
                console.log('Snap to playhead result:', result);
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
