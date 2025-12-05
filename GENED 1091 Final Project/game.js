// Game State
let currentMode = null;
let gameState = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    notes: [],
    audio: null,
    gameStartTime: null,
    gameDuration: 45000, // 45 seconds
    lastSpawnTime: 0,
    spamCount: 0,
    lastHitTime: 0,
    activeLanes: [0], // For Zhuangzi mode
    noteIdCounter: 0
};

// Mode Configurations
const modeConfigs = {
    confucius: {
        name: 'Confucius',
        description: 'Steady rhythm rewards consistency and patience',
        audioFile: 'confucius.mp3',
        tempo: 120, // BPM
        noteInterval: 1000, // ms between notes
        timingWindow: 150, // ms - forgiving
        comboResetThreshold: 3, // miss 3 before reset
        spawnPattern: 'regular',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: false
    },
    xunzi: {
        name: 'Xunzi',
        description: 'Strict discipline demands perfect precision',
        audioFile: 'xunzi.mp3',
        tempo: 160, // BPM - faster
        noteInterval: 750, // ms between notes
        timingWindow: 60, // ms - very tight
        comboResetThreshold: 1, // one miss resets
        spawnPattern: 'regular',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: false
    },
    laozi: {
        name: 'Laozi',
        description: 'Wu wei: flow naturally, do not force',
        audioFile: 'laozi.mp3',
        tempo: 110, // BPM
        noteInterval: 1100, // ms between notes
        timingWindow: 120, // ms
        comboResetThreshold: 2,
        spawnPattern: 'late', // notes spawn closer to hit zone
        spamPenalty: true, // penalize early/spam hits
        lateSpawn: true,
        laneShifting: false,
        lateSpawnMin: 0.4, // spawn at 40% of lane height
        lateSpawnMax: 0.6 // to 60% of lane height
    },
    zhuangzi: {
        name: 'Zhuangzi',
        description: 'Spontaneous shifts require adaptive awareness',
        audioFile: 'zhuangzi.mp3',
        tempo: 130, // BPM
        noteInterval: 900, // ms between notes
        timingWindow: 100, // ms
        comboResetThreshold: 2,
        spawnPattern: 'variable',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: true,
        laneShiftProbability: 0.3, // 30% chance to shift lanes
        noteDisappearProbability: 0.15 // 15% chance to disappear/reappear
    }
};

// DOM Elements
const landingScreen = document.getElementById('landing-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const modeCards = document.querySelectorAll('.mode-card');
const backButton = document.getElementById('back-button');
const modeNameEl = document.getElementById('mode-name');
const philosopherNameEl = document.getElementById('philosopher-name');
const philosophyDescEl = document.getElementById('philosophy-description');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const finalScoreEl = document.getElementById('final-score');
const hitPercentageEl = document.getElementById('hit-percentage');
const maxComboEl = document.getElementById('max-combo');
const reflectionTextEl = document.getElementById('reflection-text');
const playAgainButton = document.getElementById('play-again-button');
const menuButton = document.getElementById('menu-button');
const lane0 = document.getElementById('lane-0');
const lane1 = document.getElementById('lane-1');

// Initialize
function init() {
    // Mode selection
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            startGame(mode);
        });
    });

    // Back button
    backButton.addEventListener('click', () => {
        stopGame();
        showScreen('landing');
    });

    // Result screen buttons
    playAgainButton.addEventListener('click', () => {
        if (currentMode) {
            startGame(currentMode);
        }
    });

    menuButton.addEventListener('click', () => {
        showScreen('landing');
    });

    // Keyboard input
    document.addEventListener('keydown', handleKeyPress);
}

// Screen Management
function showScreen(screenName) {
    landingScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');

    if (screenName === 'landing') {
        landingScreen.classList.add('active');
    } else if (screenName === 'game') {
        gameScreen.classList.add('active');
    } else if (screenName === 'result') {
        resultScreen.classList.add('active');
    }
}

// Game Start
function startGame(mode) {
    currentMode = mode;
    const config = modeConfigs[mode];

    // Reset game state
    gameState = {
        score: 0,
        combo: 0,
        maxCombo: 0,
        hits: 0,
        misses: 0,
        notes: [],
        audio: null,
        gameStartTime: Date.now(),
        gameDuration: 45000,
        lastSpawnTime: 0,
        spamCount: 0,
        lastHitTime: 0,
        activeLanes: mode === 'zhuangzi' ? [0, 1] : [0],
        noteIdCounter: 0
    };

    // Update UI
    modeNameEl.textContent = config.name;
    philosopherNameEl.textContent = config.name;
    philosophyDescEl.textContent = config.description;
    updateHUD();

    // Show/hide lanes based on mode
    if (mode === 'zhuangzi') {
        lane1.style.display = 'block';
    } else {
        lane1.style.display = 'none';
    }

    // Load and play audio
    loadAudio(config.audioFile);

    // Show game screen
    showScreen('game');

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Audio Management
function loadAudio(filename) {
    if (gameState.audio) {
        gameState.audio.pause();
        gameState.audio = null;
    }

    const audio = new Audio(filename);
    audio.loop = true;
    audio.volume = 0.7;
    
    audio.addEventListener('canplaythrough', () => {
        audio.play().catch(err => {
            console.warn('Audio autoplay prevented:', err);
        });
    });

    gameState.audio = audio;
}

function stopGame() {
    if (gameState.audio) {
        gameState.audio.pause();
        gameState.audio = null;
    }
    gameState.notes = [];
    currentMode = null;
}

// Note Management
function spawnNote(laneIndex = 0) {
    const config = modeConfigs[currentMode];
    const lane = document.getElementById(`lane-${laneIndex}`);
    if (!lane) return;

    const note = document.createElement('div');
    note.className = 'note';
    note.id = `note-${gameState.noteIdCounter++}`;
    
    // Calculate spawn position based on mode
    let spawnY = 0;
    if (config.lateSpawn && config.spawnPattern === 'late') {
        // Spawn closer to hit zone (40-60% of lane height)
        const laneHeight = 600;
        const minY = laneHeight * config.lateSpawnMin;
        const maxY = laneHeight * config.lateSpawnMax;
        spawnY = minY + Math.random() * (maxY - minY);
    } else {
        spawnY = -40; // Start above the lane
    }

    note.style.top = `${spawnY}px`;
    lane.appendChild(note);

    const noteData = {
        element: note,
        lane: laneIndex,
        id: note.id,
        y: spawnY,
        speed: 2, // pixels per frame
        disappeared: false,
        reappearTime: null
    };

    // Zhuangzi: occasional disappear/reappear
    if (config.laneShifting && Math.random() < config.noteDisappearProbability) {
        noteData.disappeared = true;
        note.style.opacity = '0';
        noteData.reappearTime = Date.now() + 300 + Math.random() * 400; // reappear after 300-700ms
    }

    gameState.notes.push(noteData);
}

// Game Loop
function gameLoop() {
    if (!currentMode) return;

    const config = modeConfigs[currentMode];
    const now = Date.now();
    const elapsed = now - gameState.gameStartTime;

    // Check if game should end
    if (elapsed >= gameState.gameDuration) {
        endGame();
        return;
    }

    // Spawn notes
    const timeSinceLastSpawn = now - gameState.lastSpawnTime;
    if (timeSinceLastSpawn >= config.noteInterval) {
        // Determine which lane to spawn in
        let laneIndex = 0;
        if (config.laneShifting && gameState.activeLanes.length > 1) {
            // Zhuangzi: randomly choose lane
            if (Math.random() < config.laneShiftProbability && gameState.notes.length > 0) {
                // Switch to other lane
                laneIndex = gameState.activeLanes[0] === 0 ? 1 : 0;
            } else {
                laneIndex = gameState.activeLanes[Math.floor(Math.random() * gameState.activeLanes.length)];
            }
        }
        spawnNote(laneIndex);
        gameState.lastSpawnTime = now;
    }

    // Update notes
    updateNotes();

    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Update Notes
function updateNotes() {
    const config = modeConfigs[currentMode];
    const laneHeight = 600;
    const hitZoneTop = laneHeight - 80;

    gameState.notes.forEach((note, index) => {
        // Handle disappear/reappear (Zhuangzi)
        if (note.disappeared && note.reappearTime) {
            if (Date.now() >= note.reappearTime) {
                note.disappeared = false;
                note.element.style.opacity = '1';
                // Move closer to hit zone when reappearing
                note.y = hitZoneTop - 100 + Math.random() * 50;
                note.element.style.top = `${note.y}px`;
            } else {
                return; // Skip updating disappeared notes
            }
        }

        // Move note down
        if (!note.disappeared) {
            note.y += note.speed;
            note.element.style.top = `${note.y}px`;

            // Check if note passed hit zone (miss)
            if (note.y > hitZoneTop + 80 && !note.element.classList.contains('missed')) {
                handleMiss(note);
            }
        }
    });
}

// Input Handling
function handleKeyPress(event) {
    if (event.code === 'Space' && currentMode) {
        event.preventDefault();
        checkHit();
    }
}

function checkHit() {
    const config = modeConfigs[currentMode];
    const laneHeight = 600;
    const hitZoneTop = laneHeight - 80;
    const hitZoneCenter = hitZoneTop + 40;

    // Find closest note in hit zone
    let closestNote = null;
    let closestDistance = Infinity;

    gameState.notes.forEach(note => {
        if (note.element.classList.contains('hit') || note.element.classList.contains('missed')) {
            return;
        }

        const noteCenter = note.y + 20; // center of note
        const distance = Math.abs(noteCenter - hitZoneCenter);

        if (distance < closestDistance && noteCenter >= hitZoneTop && noteCenter <= hitZoneTop + 80) {
            closestDistance = distance;
            closestNote = note;
        }
    });

    // Check timing window
    if (closestNote) {
        const noteCenter = closestNote.y + 20;
        const hitZoneCenter = hitZoneTop + 40;
        const timingDiff = Math.abs(noteCenter - hitZoneCenter);
        const timingMs = (timingDiff / 2) * (1000 / 60); // approximate ms

        if (timingMs <= config.timingWindow) {
            handleHit(closestNote, timingMs);
        } else {
            // Too early - check for spam penalty (Laozi)
            if (config.spamPenalty) {
                handleSpamPenalty();
            }
        }
    } else {
        // No note in zone - check for spam penalty (Laozi)
        if (config.spamPenalty) {
            handleSpamPenalty();
        }
    }
}

function handleHit(note, timingMs) {
    const config = modeConfigs[currentMode];
    
    // Remove note
    note.element.classList.add('hit');
    setTimeout(() => {
        if (note.element.parentNode) {
            note.element.parentNode.removeChild(note.element);
        }
    }, 100);

    // Remove from notes array
    const index = gameState.notes.indexOf(note);
    if (index > -1) {
        gameState.notes.splice(index, 1);
    }

    // Calculate score based on timing
    let points = 100;
    let hitType = 'good';
    
    if (timingMs <= config.timingWindow * 0.3) {
        points = 150;
        hitType = 'perfect';
        note.element.classList.add('perfect');
    } else if (timingMs <= config.timingWindow * 0.6) {
        points = 120;
        hitType = 'good';
        note.element.classList.add('good');
    }

    // Update stats
    gameState.score += points;
    gameState.combo += 1;
    gameState.hits += 1;
    gameState.lastHitTime = Date.now();
    gameState.spamCount = 0; // Reset spam count on successful hit

    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }

    updateHUD();
}

function handleMiss(note) {
    const config = modeConfigs[currentMode];
    
    note.element.classList.add('missed');
    setTimeout(() => {
        if (note.element.parentNode) {
            note.element.parentNode.removeChild(note.element);
        }
    }, 200);

    // Remove from notes array
    const index = gameState.notes.indexOf(note);
    if (index > -1) {
        gameState.notes.splice(index, 1);
    }

    gameState.misses += 1;
    
    // Handle combo reset based on mode
    if (gameState.misses % config.comboResetThreshold === 0) {
        gameState.combo = 0;
    }

    updateHUD();
}

function handleSpamPenalty() {
    // Laozi mode: penalize spam/early hits
    gameState.spamCount += 1;
    const timeSinceLastHit = Date.now() - gameState.lastHitTime;
    
    if (gameState.spamCount > 2 && timeSinceLastHit < 200) {
        // Reduce score for excessive spam
        gameState.score = Math.max(0, gameState.score - 20);
        updateHUD();
    }
}

// HUD Updates
function updateHUD() {
    scoreEl.textContent = gameState.score;
    comboEl.textContent = gameState.combo;
}

// End Game
function endGame() {
    stopGame();

    // Calculate stats
    const totalNotes = gameState.hits + gameState.misses;
    const hitPercentage = totalNotes > 0 
        ? Math.round((gameState.hits / totalNotes) * 100) 
        : 0;

    // Update result screen
    finalScoreEl.textContent = gameState.score;
    hitPercentageEl.textContent = `${hitPercentage}%`;
    maxComboEl.textContent = gameState.maxCombo;

    // Reflection text
    const config = modeConfigs[currentMode];
    reflectionTextEl.textContent = `Did this rhythm feel natural or forced? (${config.name} mode)`;

    // Clear notes
    document.querySelectorAll('.note').forEach(note => note.remove());
    gameState.notes = [];

    showScreen('result');
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);

