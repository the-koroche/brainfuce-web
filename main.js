import { StateMachine } from './state_machine.js';

// DOM
const codeInput = document.getElementById('code-input');
const outputArea = document.getElementById('output');
const memoryTitle = document.getElementById('memory-title');
const memoryBox = document.getElementById('memory-box');

const btnRun = document.getElementById('run-button');
const btnStop = document.getElementById('stop-button');
const btnStep = document.getElementById('step-button');
const btnReset = document.getElementById('reset-button');

const sliderTrack = document.getElementById('slider-track');
const sliderThumb = document.getElementById('slider-thumb');
const speedLabel = document.getElementById('speed-label');
const autoscrollCheck = document.getElementById('autoscroll-memory-check');
const highlightCheck = document.getElementById('highlight-command-check');

// State
const bf = new StateMachine();
let runInterval = null;

// Track which memory cells have been modified or visited (always start with cell 0)
let discoveredCells = new Set([0]);
// Flag to temporarily pause execution while the UI is smoothly scrolling
let isScrollingPause = false;
// Flag to track if a step was just executed
let wasStep = false;

const SPEED_MODES = [
    { label: "As fast as possible", delay: 0,   stepsPerTick: 500, percentage: 0 },
    { label: "2.5 ms",               delay: 5,   stepsPerTick: 2,  percentage: 25 },
    { label: "50 ms",              delay: 50,  stepsPerTick: 1,  percentage: 50 },
    { label: "200 ms",             delay: 200, stepsPerTick: 1,  percentage: 75 },
    { label: "700 ms",             delay: 700, stepsPerTick: 1,  percentage: 100 }
];

let currentModeIndex = 2;
let currentSpeedMode = SPEED_MODES[currentModeIndex];

// Custom range slider

function setSliderValue(index) {
    currentModeIndex = index;
    currentSpeedMode = SPEED_MODES[index];

    speedLabel.textContent = currentSpeedMode.label;
    sliderThumb.style.left = `${currentSpeedMode.percentage}%`;

    // If the interpreter is running, hot-swap the execution interval
    if (bf.running && !isScrollingPause) {
        pauseInterval();
        startInterval();
    }
}

function handleSliderPosition(clientX) {
    const rect = sliderTrack.getBoundingClientRect();
    let offsetX = (clientX - rect.left) / rect.width;
    offsetX = Math.max(0, Math.min(1, offsetX));

    // Snap to the closest step tick index
    const closestIndex = Math.round(offsetX * (SPEED_MODES.length - 1));
    setSliderValue(closestIndex);
}

// Desktop mouse handling for slider dragging
sliderTrack.addEventListener('mousedown', (e) => {
    handleSliderPosition(e.clientX);
    const onMouseMove = (moveEvent) => handleSliderPosition(moveEvent.clientX);
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

// Mobile touch handling for responsive dragging
sliderTrack.addEventListener('touchstart', (e) => {
    handleSliderPosition(e.touches[0].clientX);
    const onTouchMove = (moveEvent) => handleSliderPosition(moveEvent.touches[0].clientX);
    const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
}, { passive: true });


// UI

function updateUI() {
    const tape = bf.getTape();
    const currentPtr = bf.getPointer();

    // Mark current data pointer location as visited
    discoveredCells.add(currentPtr);
    const sortedIndices = Array.from(discoveredCells).sort((a, b) => a - b);

    // Clear previous elements to rebuild the sparse memory array
    memoryBox.innerHTML = '';
    let activeCellDOM = null;

    sortedIndices.forEach(index => {
        const cell = document.createElement('div');
        cell.className = 'memory-cell';

        // Highlight active cell using the requested modern color-mix syntax
        if (index === currentPtr && (bf.running || wasStep)) {
            cell.style.backgroundColor = 'color-mix(in srgb, var(--background-color) 50%, var(--accent-color) 50%)';
            cell.style.borderColor = 'var(--border-color)';
            activeCellDOM = cell;
        }

        cell.innerHTML = `
            <div class="memory-index">${index}</div>
            <div>${tape[index]}</div>
        `;
        memoryBox.appendChild(cell);
    });

    memoryTitle.innerText = `Memory (${sortedIndices.length} cell` + (sortedIndices.length > 1 ? 's' : '') + ')';

    // Handle horizontal auto-scrolling if the cell is valid and not in max-speed mode
    if (activeCellDOM && currentSpeedMode.delay > 0 && bf.running && autoscrollCheck.checked) {
        checkVisibilityAndScroll(activeCellDOM);
    }
}

function checkVisibilityAndScroll(activeCell) {
    const containerRect = memoryBox.getBoundingClientRect();
    const cellRect = activeCell.getBoundingClientRect();

    // Determine if the active element is physically clipped out of the current viewbounds
    const isLeftClipped = cellRect.left < containerRect.left;
    const isRightClipped = cellRect.right > containerRect.right;

    if (isLeftClipped || isRightClipped) {
        // Halt interpreter loops during active scrolling animation to prevent stack visual de-sync
        if (bf.running && !isScrollingPause) {
            isScrollingPause = true;
            pauseInterval();
        }

        // Native browser centering mechanics - bypasses unpredictable custom offset math
        activeCell.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });

        // Safe standard timeout fallback to resume execution pipeline after the smooth transitions finish
        setTimeout(() => {
            if (isScrollingPause && bf.running) {
                isScrollingPause = false;
                startInterval();
            } else {
                isScrollingPause = false;
            }
        }, 400);
    }
}

// Interpreter loop management

function highlightIP(ip) {
    if (!highlightCheck.checked || !codeInput || ip === undefined || ip === null) return;
    if (document.activeElement !== codeInput) {
        codeInput.focus();
    }
    codeInput.setSelectionRange(ip, ip+1);
}

function startInterval() {
    if (runInterval) return;

    codeInput.setAttribute('readonly', true);

    runInterval = setInterval(() => {
        // Execute chunk increments per interval step for optimal performance rendering
        for (let k = 0; k < currentSpeedMode.stepsPerTick; k++) {
            const res = bf.step();

            if (res.output) {
                outputArea.value += res.output;
                outputArea.scrollTop = outputArea.scrollHeight;
            }

            if (!res.status) {
                stopExecution();
                break;
            }
            // Break early during massive loops if a fresh unseen cell is allocated, allowing UI to update
            const currentPtr = bf.getPointer();
            if (!discoveredCells.has(currentPtr)) {
                break;
            }
        }

        updateUI();
        highlightIP(bf.getInstructionChar().index);
    }, currentSpeedMode.delay);
}

function pauseInterval() {
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
    }
}

function stopExecution() {
    pauseInterval();
    bf.running = false;
    isScrollingPause = false;
    wasStep = false;

    codeInput.removeAttribute('readonly');
    setControlStates(false);
}

function setControlStates(isRunning) {
    btnRun.classList.toggle('disabled', isRunning);
    btnStep.classList.toggle('disabled', isRunning);
    btnReset.classList.toggle('disabled', isRunning);
    btnStop.classList.toggle('disabled', !isRunning);
}

// Button event handlers

btnStep.addEventListener('click', () => {
    if (bf.running || isScrollingPause) return;
    wasStep = true;

    // Load initial textarea instructions on initialization step click
    if (bf.getInstructionPointer() === 0 && bf.getCode() === "") {
        bf.load(codeInput.value);
    }

    const res = bf.step();
    if (res.output) {
        outputArea.value += res.output;
        outputArea.scrollTop = outputArea.scrollHeight;
    }

    updateUI();
    highlightIP(bf.getInstructionChar().index);

    if (!res.status) {
        stopExecution();
    }
});

btnRun.addEventListener('click', () => {
    if (bf.running) return;

    if (bf.getInstructionPointer() === 0) {
        bf.load(codeInput.value);
    }
    bf.running = true;

    wasStep = false;
    setControlStates(true);
    startInterval();
});

btnStop.addEventListener('click', () => {
    stopExecution();
});

btnReset.addEventListener('click', () => {
    if (bf.running || isScrollingPause) return;
    bf.load("");
    discoveredCells = new Set([0]);

    outputArea.value = "";
    memoryBox.scrollLeft = 0;

    wasStep = false;
    updateUI();
});

// Initial UI setup
setSliderValue(currentModeIndex);
updateUI();
setControlStates(false);

// Initial focus
codeInput.focus();
codeInput.textContent = "+[>++>+++>++++>+++++<<<<[[-]>]<<<<<+]\n; simple 1,2,3,4,5 loop"