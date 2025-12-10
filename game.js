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
    activeLanes: [0, 1, 2, 3], // All 4 lanes active
    noteIdCounter: 0,
    keyToLane: { 'KeyA': 0, 'KeyS': 1, 'KeyD': 2, 'KeyF': 3 }
};

// Mode Configurations
const modeConfigs = {
    confucius: {
        name: 'Confucius',
        fullDescription: 'Virtue as Habitual Practice',
        description: 'Confucius teaches that harmony comes from moderation and repetition. In this mode, the rhythm is regular and moderate. Minor timing errors are forgiven, and consistency is rewarded. This reflects the Analects\' view that virtue can be achieved through habitual practice—acting with the right measure, at the right time, until it becomes natural.',
        audioFile: 'Music/Wild Geese Descending on the Sandbank.mp3',
        backgroundImage: ' Backgrounds/Confucius Background.png',
        tempo: 120, // BPM
        noteInterval: 1000, // ms between notes
        timingWindow: 200, // ms - very forgiving
        comboResetThreshold: 3, // miss 3 before reset
        spawnPattern: 'regular',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: false,
        earlyCue: false
    },
    xunzi: {
        name: 'Xunzi',
        fullDescription: 'Discipline and Control',
        description: 'Xunzi argues that humans are born chaotic and must be trained into virtue through rigid ritual. This mode has strict timing windows where one mistake resets your points. The beat is mechanical and fast, with visual cues appearing early to demand planning and control. Morality is forged through discipline—every action must be precise.',
        audioFile: 'Music/Three_Variations_Of_The_Plum_Blossom.mp3',
        backgroundImage: ' Backgrounds/Xunzi Background.png',
        tempo: 160, // BPM - faster
        noteInterval: 600, // ms between notes - faster
        timingWindow: 50, // ms - very tight
        comboResetThreshold: 1, // one miss resets
        spawnPattern: 'regular',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: false,
        earlyCue: true, // Show early visual cues
        earlyCueTime: 1500 // Show cue 1.5 seconds before note arrives
    },
    laozi: {
        name: 'Laozi',
        fullDescription: 'Wu Wei: Non-Action',
        description: 'Laozi\'s Daodejing teaches wu wei—acting without forcing, flowing with the Way. In this mode, cues appear unpredictably, often at the last second. Overreacting or pressing early breaks your streak. You must align with the game\'s "Way" instead of forcing control or overplanning. Peace arises from surrendering and timing with nature.',
        audioFile: 'Music/The Autumn Moon over the Han Palace.mp3',
        backgroundImage: ' Backgrounds/Laozi Background.png',
        tempo: 110, // BPM
        noteInterval: 1200, // ms between notes - variable
        timingWindow: 120, // ms
        comboResetThreshold: 2,
        spawnPattern: 'late', // notes spawn very close to hit zone
        spamPenalty: true, // penalize early/spam hits
        lateSpawn: true,
        laneShifting: false,
        lateSpawnMin: 0.7, // spawn at 70% of lane height (very late)
        lateSpawnMax: 0.85, // to 85% of lane height (almost at hit zone)
        earlyCue: false,
        variableInterval: true, // Unpredictable timing
        minInterval: 800,
        maxInterval: 1600
    },
    zhuangzi: {
        name: 'Zhuangzi',
        fullDescription: 'Spontaneity and Transformation',
        description: 'Zhuangzi celebrates spontaneity and the ever-changing nature of reality. This mode features shifting rhythms with keys moving between columns or even disappearing. You must adapt to surprise and ambiguity. Wisdom is learning to let the wisdom change you—embracing transformation rather than resisting it.',
        audioFile: 'Music/Butterfly Lovers Violin Concerto - First Movement.mp3',
        backgroundImage: ' Backgrounds/Zhuangzi Background.png',
        tempo: 130, // BPM
        noteInterval: 900, // ms between notes
        timingWindow: 100, // ms
        comboResetThreshold: 2,
        spawnPattern: 'variable',
        spamPenalty: false,
        lateSpawn: false,
        laneShifting: true,
        laneShiftProbability: 0.4, // 40% chance to shift lanes
        noteDisappearProbability: 0.2, // 20% chance to disappear/reappear
        earlyCue: false
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
        stopGame({ keepMode: false });
        showScreen('landing');
    });

    // Result screen buttons
    playAgainButton.addEventListener('click', () => {
        if (currentMode) {
            startGame(currentMode);
        }
    });

    menuButton.addEventListener('click', () => {
        stopGame({ keepMode: false });
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

    // Set background image for game screen
    if (config.backgroundImage) {
        gameScreen.style.backgroundImage = `url('${config.backgroundImage}')`;
        gameScreen.style.backgroundSize = 'cover';
        gameScreen.style.backgroundPosition = 'center center';
        gameScreen.style.backgroundRepeat = 'no-repeat';
    }

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
        gameDuration: 0, // Will be set from audio duration
        lastSpawnTime: Date.now(), // Start spawning immediately
        spamCount: 0,
        lastHitTime: 0,
        activeLanes: [0, 1, 2, 3], // All 4 lanes active
        noteIdCounter: 0,
        keyToLane: { 'KeyA': 0, 'KeyS': 1, 'KeyD': 2, 'KeyF': 3 }
    };

    // Update UI
    modeNameEl.textContent = config.name;
    philosopherNameEl.textContent = config.fullDescription || config.name;
    philosophyDescEl.textContent = config.description;
    updateHUD();

    // Show all lanes and clean up any leftover notes
    for (let i = 0; i < 4; i++) {
        const lane = document.getElementById(`lane-${i}`);
        if (lane) {
            lane.style.display = 'block';
            // Remove any leftover note elements
            const existingNotes = lane.querySelectorAll('.note');
            existingNotes.forEach(note => note.remove());
        }
    }
    
    // Clear all notes from DOM
    document.querySelectorAll('.note').forEach(note => note.remove());

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
    audio.loop = false; // Don't loop - play until end
    audio.volume = 0.7;
    
    // Set game duration from audio duration when metadata loads
    audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
            gameState.gameDuration = audio.duration * 1000; // Convert to milliseconds
        }
    });
    
    // End game when audio finishes
    audio.addEventListener('ended', () => {
        endGame();
    });
    
    audio.addEventListener('canplaythrough', () => {
        // If duration wasn't set from metadata, try to get it now
        if (audio.duration && isFinite(audio.duration) && gameState.gameDuration === 0) {
            gameState.gameDuration = audio.duration * 1000;
        }
        audio.play().catch(err => {
            console.warn('Audio autoplay prevented:', err);
        });
    });

    gameState.audio = audio;
}

function stopGame({ keepMode = false } = {}) {
    if (gameState.audio) {
        gameState.audio.pause();
        gameState.audio = null;
    }
    
    // Clean up notes
    document.querySelectorAll('.note').forEach(note => {
        if (note.parentNode) {
            note.parentNode.removeChild(note);
        }
    });
    
    gameState.notes = [];
    
    if (!keepMode) {
        currentMode = null;
    }
}

// Note Management
function spawnNote(laneIndex = 0) {
    const config = modeConfigs[currentMode];
    const lane = document.getElementById(`lane-${laneIndex}`);
    if (!lane) return;

    const note = document.createElement('div');
    note.className = 'note';
    note.id = `note-${gameState.noteIdCounter++}`;
    
    // All notes spawn from the top (above the lane)
    // For Laozi, we'll use variable timing instead of late spawning to maintain unpredictability
    let spawnY = -40; // Start above the lane - all notes appear from top

    note.style.top = `${spawnY}px`;
    lane.appendChild(note);

    const noteData = {
        element: note,
        lane: laneIndex,
        id: note.id,
        y: spawnY,
        speed: 1.2, // pixels per frame - starts slow
        baseSpeed: 1.2,
        disappeared: false,
        reappearTime: null,
        shifted: false
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

    // Check if game should end (audio finished or duration exceeded)
    // Check if audio has ended
    if (gameState.audio && gameState.audio.ended) {
        endGame();
        return;
    }
    
    // Also check duration as fallback (in case audio duration wasn't loaded)
    if (gameState.gameDuration > 0 && elapsed >= gameState.gameDuration) {
        endGame();
        return;
    }
    
    // If duration not set yet, keep playing (notes will keep spawning)
    // This handles cases where audio metadata hasn't loaded yet

    // Spawn notes
    const timeSinceLastSpawn = now - gameState.lastSpawnTime;
    let nextInterval = config.noteInterval;
    
    // Laozi: variable interval for unpredictability
    if (config.variableInterval) {
        nextInterval = config.minInterval + Math.random() * (config.maxInterval - config.minInterval);
    }
    
    // Ensure first note spawns quickly
    if (gameState.lastSpawnTime === 0 || timeSinceLastSpawn >= nextInterval) {
        // Determine which lane(s) to spawn in based on mode
        let lanesToSpawn = [];
        
        if (config.laneShifting) {
            // Zhuangzi: random lane selection with shifting
            if (Math.random() < config.laneShiftProbability && gameState.notes.length > 0) {
                // Switch to different lane
                const currentLanes = [...new Set(gameState.notes.map(n => n.lane))];
                const availableLanes = gameState.activeLanes.filter(l => !currentLanes.includes(l));
                lanesToSpawn = availableLanes.length > 0 
                    ? [availableLanes[Math.floor(Math.random() * availableLanes.length)]]
                    : [gameState.activeLanes[Math.floor(Math.random() * gameState.activeLanes.length)]];
            } else {
                lanesToSpawn = [gameState.activeLanes[Math.floor(Math.random() * gameState.activeLanes.length)]];
            }
        } else {
            // Default: spawn in a random lane from active lanes (all 4 for most modes)
            lanesToSpawn = [gameState.activeLanes[Math.floor(Math.random() * gameState.activeLanes.length)]];
        }
        
        // Spawn note in selected lane
        lanesToSpawn.forEach(laneIndex => {
            spawnNote(laneIndex);
        });
        
        gameState.lastSpawnTime = now;
    }
    
    // Xunzi: Show early visual cues
    if (config.earlyCue) {
        gameState.notes.forEach(note => {
            if (!note.cueShown) {
                const laneHeight = 600;
                const hitZoneTop = laneHeight - 80;
                const distanceToHitZone = hitZoneTop - note.y;
                const timeToHitZone = (distanceToHitZone / note.speed) * (1000 / 60); // approximate ms
                
                if (timeToHitZone <= config.earlyCueTime && timeToHitZone > 0) {
                    note.element.classList.add('early-cue');
                    note.cueShown = true;
                }
            }
        });
    }

    // Update notes
    updateNotes();
    
    // Cleanup: Remove any notes that are no longer in the DOM or have been hit
    gameState.notes = gameState.notes.filter(note => {
        // Check if note element exists
        if (!note.element) {
            return false;
        }
        
        // Remove notes that have been hit (they should already be removed, but just in case)
        if (note.element.classList.contains('hit-correct') || note.element.classList.contains('hit-wrong')) {
            // Force remove if still in DOM
            if (note.element.parentNode) {
                try {
                    note.element.parentNode.removeChild(note.element);
                } catch (e) {
                    // Already removed, ignore
                }
            }
            return false;
        }
        
        // Check if element is still in DOM
        if (!note.element.parentNode) {
            return false; // Remove notes that are no longer in DOM
        }
        
        return true;
    });

    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Update Notes
function updateNotes() {
    const config = modeConfigs[currentMode];
    const laneHeight = 600;
    const hitZoneTop = laneHeight - 80;
    const hitZoneCenter = hitZoneTop + 40;
    
    // Calculate speed multiplier based on elapsed time (starts at 1.0, increases to 2.0)
    const elapsed = Date.now() - gameState.gameStartTime;
    const progress = Math.min(elapsed / gameState.gameDuration, 1.0);
    const speedMultiplier = 1.0 + (progress * 1.0); // 1.0x to 2.0x speed

    // Create a copy of notes array to avoid modification during iteration
    const notesToUpdate = [...gameState.notes];
    
    notesToUpdate.forEach((note, index) => {
        // Skip if note is already being removed
        if (!note.element || !note.element.parentNode) {
            return;
        }
        
        // Skip if note has been hit
        if (note.element.classList.contains('hit-correct') || note.element.classList.contains('hit-wrong')) {
            return;
        }
        
        // Update note speed based on progress
        if (note.baseSpeed) {
            note.speed = note.baseSpeed * speedMultiplier;
        }
        
        // Handle disappear/reappear (Zhuangzi)
        if (note.disappeared && note.reappearTime) {
            if (Date.now() >= note.reappearTime) {
                note.disappeared = false;
                note.element.style.opacity = '1';
                // Move closer to hit zone when reappearing
                note.y = hitZoneTop - 100 + Math.random() * 50;
                note.element.style.top = `${note.y}px`;
            } else {
                // Note is disappeared but still needs to track time - continue to next note
                return;
            }
        }

        // Zhuangzi: Notes shift between lanes much earlier (20% of lane height)
        if (config.laneShifting && !note.disappeared && !note.shifted) {
            const shiftPoint = laneHeight * 0.2; // Shift at 20% instead of 50%
            // Check if note has passed the shift point
            if (note.y >= shiftPoint && note.y < shiftPoint + 10) {
                const oldLane = document.getElementById(`lane-${note.lane}`);
                // Pick a random different lane
                const otherLanes = gameState.activeLanes.filter(l => l !== note.lane);
                if (otherLanes.length > 0) {
                    const newLaneIndex = otherLanes[Math.floor(Math.random() * otherLanes.length)];
                    const newLane = document.getElementById(`lane-${newLaneIndex}`);
                    
                    if (oldLane && newLane && note.element.parentNode === oldLane) {
                        oldLane.removeChild(note.element);
                        newLane.appendChild(note.element);
                        note.lane = newLaneIndex;
                        note.shifted = true;
                    }
                }
            }
        }

        // Move note down (all visible notes should move)
        if (!note.disappeared) {
            note.y += note.speed;
            note.element.style.top = `${note.y}px`;

            // Check if note passed hit zone (miss) - remove immediately
            if (note.y > hitZoneTop + 80) {
                handleMiss(note);
                return; // Skip further processing for this note
            }
        }
    });
}

// Input Handling
function handleKeyPress(event) {
    if (!currentMode) return;
    
    const laneIndex = gameState.keyToLane[event.code];
    if (laneIndex !== undefined) {
        event.preventDefault();
        checkHit(laneIndex);
    }
}

function checkHit(laneIndex) {
    const config = modeConfigs[currentMode];
    
    // Get the actual hit zone element for lane
    const hitZoneEl = document.getElementById(`hit-zone-${laneIndex}`);
    if (!hitZoneEl) return;
    
    // Get the actual rendered position of hit zone
    const hzRect = hitZoneEl.getBoundingClientRect();
    const hzCenterY = (hzRect.top + hzRect.bottom) / 2;
    
    // Look for a note in lane that is actually inside the green zone
    let bestNote = null;
    let bestDistance = Infinity;
    
    gameState.notes.forEach(note => {
        if (!note.element || !note.element.parentNode) return;
        if (note.disappeared) return;
        if (note.lane !== laneIndex) return;
        
        // Get the actual rendered position of the note
        const rect = note.element.getBoundingClientRect();
        const centerY = (rect.top + rect.bottom) / 2;
        
        // Check if note actually overlaps with the green zone visually
        const overlaps = rect.bottom >= hzRect.top && rect.top <= hzRect.bottom;
        
        if (overlaps) {
            const dist = Math.abs(centerY - hzCenterY);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNote = note;
            }
        }
    });
    
    // If we found a note in the correct lane & in the green zone → HIT
    if (bestNote) {
        console.log(`[checkHit] CORRECT HIT detected! Lane: ${laneIndex}, Distance: ${bestDistance.toFixed(1)}px, Calling handleHit`);
        // Remove note from array immediately to prevent double processing
        const noteIndex = gameState.notes.indexOf(bestNote);
        if (noteIndex > -1) {
            gameState.notes.splice(noteIndex, 1);
        }
        
        // Calculate timing based on distance from center
        const timingMs = (bestDistance / Math.max(bestNote.speed, 0.1)) * (1000 / 60);
        handleHit(bestNote, timingMs);
        gameState.spamCount = 0;
        return; // Exit immediately after successful hit
    }
    
    // No note in green zone in this lane
    let wrongLaneNote = null;
    
    gameState.notes.forEach(note => {
        if (!note.element || !note.element.parentNode) return;
        if (note.disappeared) return;
        if (note.lane === laneIndex) return; // Skip notes in the correct lane
        
        // Get the hit zone for the note's lane
        const otherHitZone = document.getElementById(`hit-zone-${note.lane}`);
        if (!otherHitZone) return;
        
        const noteRect = note.element.getBoundingClientRect();
        const otherHzRect = otherHitZone.getBoundingClientRect();
        
        // Check if note overlaps with its own lane's green zone
        const overlaps = noteRect.bottom >= otherHzRect.top && noteRect.top <= otherHzRect.bottom;
        
        if (overlaps) {
            wrongLaneNote = note;
        }
    });
    
    if (wrongLaneNote) {
        // Pressed the wrong key while a note was in another lane's green zone
        console.log(`[checkHit] WRONG KEY detected! Pressed lane: ${laneIndex}, Note lane: ${wrongLaneNote.lane}, Calling handleWrongKeyPress`);
        handleWrongKeyPress(laneIndex, wrongLaneNote.lane);
        return;
    }
    
    // No note in ANY green zone → just a "too early / too late" empty press
    if (config.spamPenalty) {
        handleSpamPenalty();
    } else {
        handleEmptyPress(); // Generic penalty for empty press
    }
}

function handleHit(note, distanceFromCenter) {
    const config = modeConfigs[currentMode];
    
    // distanceFromCenter is passed from checkHit (calculated using getBoundingClientRect())
    // If not provided or invalid, calculate it using visual positions
    if (distanceFromCenter === undefined || isNaN(distanceFromCenter)) {
        const hitZoneEl = document.getElementById(`hit-zone-${note.lane}`);
        if (hitZoneEl && note.element) {
            const hzRect = hitZoneEl.getBoundingClientRect();
            const hzCenterY = (hzRect.top + hzRect.bottom) / 2;
            const noteRect = note.element.getBoundingClientRect();
            const noteCenterY = (noteRect.top + noteRect.bottom) / 2;
            distanceFromCenter = Math.abs(noteCenterY - hzCenterY);
        } else {
            // Fallback to old calculation if elements not available
            const laneHeight = 600;
            const hitZoneTop = laneHeight - 80;
            const hitZoneCenter = hitZoneTop + 40;
            const noteCenter = note.y + 20;
            distanceFromCenter = Math.abs(noteCenter - hitZoneCenter);
        }
    }
    
    // Maximum distance for scoring (hit zone is 80px tall, so max distance is 40px from center)
    const maxDistance = 40;
    const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1.0);
    
    // Base points: more points the closer to the green line (center)
    // Perfect hit (0px from center) = 300 points
    // Edge of hit zone (40px from center) = 100 points
    // Linear interpolation: closer = more points
    // Ensure basePoints is always positive (clamp normalizedDistance to prevent issues)
    const clampedNormalizedDistance = Math.min(normalizedDistance, 1.0);
    const basePoints = Math.max(100, 300 - (clampedNormalizedDistance * 200)); // 300 at center, 100 at edge (minimum)
    
    // Determine hit type based on distance from center
    let hitType = 'good';
    if (distanceFromCenter <= 5) {
        hitType = 'perfect';
        note.element.classList.add('perfect');
    } else if (distanceFromCenter <= 15) {
        hitType = 'good';
        note.element.classList.add('good');
    }
    
    // Progressive scoring: more points as song progresses
    const elapsed = Date.now() - gameState.gameStartTime;
    // Handle case where gameDuration might not be set yet
    const progress = gameState.gameDuration > 0 
        ? Math.min(elapsed / gameState.gameDuration, 1.0)
        : 0; // Default to 0 if duration not set
    const progressMultiplier = 1.0 + (progress * 0.5); // 1.0x to 1.5x multiplier
    
    // Combo multiplier: more points for higher combos
    // Formula: 1.0 + (combo * 0.05) so 10 combo = 1.5x, 20 combo = 2.0x????
    const comboMultiplier = 1.0 + (gameState.combo * 0.05);
    
    // Calculate final points: base points * progress * combo
    // Ensure points are always positive and meaningful
    const rawPoints = basePoints * progressMultiplier * comboMultiplier;
    const points = Math.max(50, Math.round(rawPoints)); // Minimum 50 points, ensures score always increases
    
    // Store element reference before removing from array
    const noteElement = note.element;
    
    // Remove note from array first to prevent double processing
    const index = gameState.notes.indexOf(note);
    if (index > -1) {
        gameState.notes.splice(index, 1);
    }
    
    // Add green glow for correct hit and remove from DOM immediately
    if (noteElement) {
        // Add class for visual feedback
        noteElement.classList.add('hit-correct');
        
        // Force immediate visual removal - multiple methods to ensure it works
        noteElement.style.display = 'none';
        noteElement.style.opacity = '0';
        noteElement.style.visibility = 'hidden';
        noteElement.style.pointerEvents = 'none';
        
        // Remove from DOM - try multiple approaches
        if (noteElement.parentNode) {
            try {
                noteElement.parentNode.removeChild(noteElement);
            } catch (e) {
                // Try alternative removal method
                try {
                    noteElement.remove();
                } catch (e2) {
                    // If all else fails, just hide it
                    noteElement.style.display = 'none';
                }
            }
        } else {
            // Element already removed from DOM, just ensure it's hidden
            noteElement.style.display = 'none';
        }
    }

    // Update stats immediately - add points
    // Ensure we're actually adding positive points
    // Points should always be positive (at least 1)
    const previousScore = gameState.score || 0;
    console.log(`[handleHit] Previous score: ${previousScore}, Points to add: ${points}, New score will be: ${previousScore + points}`);
    const newScore = previousScore + points; // ADD points (always positive)
    gameState.score = Math.max(0, newScore); // Ensure score never goes negative
    console.log(`[handleHit] Score after update: ${gameState.score}`);
    gameState.combo += 1;
    gameState.hits += 1;
    gameState.lastHitTime = Date.now();
    gameState.spamCount = 0; // Reset spam count on successful hit

    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }

    // Update HUD immediately so user sees points change
    updateHUD();
    
    // Show points gained indicator (use stored reference)
    if (noteElement) {
        showPointsIndicator(points, noteElement);
    }
}

function handleWrongTiming(note) {
    // Store element reference before removing from array
    const noteElement = note.element;
    
    // Remove note from array FIRST to prevent double processing
    const index = gameState.notes.indexOf(note);
    if (index > -1) {
        gameState.notes.splice(index, 1);
    }
    
    // Add red outline for wrong timing and remove from DOM immediately
    if (noteElement) {
        noteElement.classList.add('hit-wrong');
        // Force immediate visual removal - multiple methods
        noteElement.style.display = 'none';
        noteElement.style.opacity = '0';
        noteElement.style.visibility = 'hidden';
        noteElement.style.pointerEvents = 'none';
        
        // Remove from DOM - try multiple approaches
        if (noteElement.parentNode) {
            try {
                noteElement.parentNode.removeChild(noteElement);
            } catch (e) {
                try {
                    noteElement.remove();
                } catch (e2) {
                    noteElement.style.display = 'none';
                }
            }
        } else {
            noteElement.style.display = 'none';
        }
    }
    
    // Penalty for wrong timing (pressed outside green area)
    const elapsed = Date.now() - gameState.gameStartTime;
    const progress = Math.min(elapsed / gameState.gameDuration, 1.0);
    const penalty = Math.round(75 * (1.0 + progress)); // 75-150 point penalty, increases with progress
    const previousScore = gameState.score || 0;
    console.log(`[handleWrongTiming] Previous score: ${previousScore}, Penalty: ${penalty}, New score will be: ${previousScore - penalty}`);
    gameState.score = Math.max(0, gameState.score - penalty);
    console.log(`[handleWrongTiming] Score after update: ${gameState.score}`);
    
    // Count as miss for wrong timing
    gameState.misses += 1;
    const config = modeConfigs[currentMode];
    
    // Xunzi: One mistake resets score
    if (config.comboResetThreshold === 1) {
        gameState.score = 0;
        gameState.combo = 0;
    } else {
        // Handle combo reset based on mode
        if (gameState.misses % config.comboResetThreshold === 0) {
            gameState.combo = 0;
        } else {
            // Reset combo on wrong timing
            gameState.combo = 0;
        }
    }
    
    // Update HUD immediately so user sees points change
    updateHUD();
    
    // Show penalty indicator
    if (noteElement) {
        showPointsIndicator(-penalty, noteElement);
    }
}

function handleMiss(note) {
    const config = modeConfigs[currentMode];
    
    // Store element reference before manipulating
    const noteElement = note.element;
    
    // Remove note from array
    const index = gameState.notes.indexOf(note);
    if (index > -1) {
        gameState.notes.splice(index, 1);
    }
    
    // Remove from DOM
    if (noteElement && noteElement.parentNode) {
        noteElement.parentNode.removeChild(noteElement);
    }

    // Penalty for missing a note
    const elapsed = Date.now() - gameState.gameStartTime;
    const progress = gameState.gameDuration > 0
        ? Math.min(elapsed / gameState.gameDuration, 1.0)
        : 0;
    const penalty = Math.round(75 * (1.0 + progress)); // 75-150
    
    const previousScore = gameState.score || 0;
    console.log(`[handleMiss] Previous score: ${previousScore}, Penalty: ${penalty}`);
    gameState.score = Math.max(0, previousScore - penalty);

    gameState.misses += 1;
    
    // Xunzi: one mistake nukes score
    if (config.comboResetThreshold === 1) {
        gameState.score = 0;
        gameState.combo = 0;
    } else {
        gameState.combo = 0;
    }

    // Update HUD immediately so user sees points change
    updateHUD();
    
    // Show penalty indicator
    if (noteElement) {
        showPointsIndicator(-penalty, noteElement);
    }
}

function handleWrongKeyPress(pressedLane, noteLane) {
    // Penalty for pressing wrong key (wrong ASDF)
    const elapsed = Date.now() - gameState.gameStartTime;
    const progress = Math.min(elapsed / gameState.gameDuration, 1.0);
    const penalty = Math.round(100 * (1.0 + progress)); // 100-200 point penalty, increases with progress
    const previousScore = gameState.score || 0;
    console.log(`[handleWrongKeyPress] Previous score: ${previousScore}, Penalty: ${penalty}, New score will be: ${previousScore - penalty}`);
    gameState.score = Math.max(0, gameState.score - penalty);
    console.log(`[handleWrongKeyPress] Score after update: ${gameState.score}`);
    
    // Count as miss
    gameState.misses += 1;
    const config = modeConfigs[currentMode];
    
    // Xunzi: One mistake resets score
    if (config.comboResetThreshold === 1) {
        gameState.score = 0;
        gameState.combo = 0;
    } else {
        // Reset combo on wrong key
        gameState.combo = 0;
    }
    
    // Update HUD immediately so user sees points change
    updateHUD();
    
    // Show penalty indicator near score
    const scoreRect = scoreEl.getBoundingClientRect();
    const indicator = document.createElement('div');
    indicator.className = 'points-indicator';
    indicator.textContent = `-${penalty} (Wrong Key)`;
    indicator.style.position = 'fixed';
    indicator.style.left = `${scoreRect.right + 20}px`;
    indicator.style.top = `${scoreRect.top}px`;
    indicator.style.color = '#000';
    indicator.style.fontSize = '24px';
    indicator.style.fontWeight = 'bold';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.style.transition = 'all 0.8s ease-out';
        indicator.style.transform = 'translateY(-50px)';
        indicator.style.opacity = '0';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 800);
    }, 10);
}

function handleSpamPenalty() {
    // Laozi mode: penalize spam/early hits - breaks streak
    // Only apply penalty if there's no valid hit happening
    gameState.spamCount += 1;
    const timeSinceLastHit = Date.now() - gameState.lastHitTime;
    
    // Only penalize if spamming without hitting notes (not immediately after a hit)
    if (gameState.spamCount > 2 && timeSinceLastHit > 500) {
        // Break combo for overreacting/forcing (only if not hitting notes)
        gameState.combo = 0;
        const penalty = 20;
        gameState.score = Math.max(0, gameState.score - penalty);
        updateHUD();
    }
}

function handleEmptyPress() {
    // Generic penalty for pressing when no note is in any green zone
    const elapsed = Date.now() - gameState.gameStartTime;
    const progress = gameState.gameDuration > 0
        ? Math.min(elapsed / gameState.gameDuration, 1.0)
        : 0;
    const penalty = Math.round(75 * (1.0 + progress)); // 75–150, like misses
    const previousScore = gameState.score || 0;
    console.log(`[handleEmptyPress] Previous score: ${previousScore}, Penalty: ${penalty}`);
    gameState.score = Math.max(0, previousScore - penalty);
    gameState.misses += 1;
    const config = modeConfigs[currentMode];
    
    // Xunzi: one mistake nukes score
    if (config.comboResetThreshold === 1) {
        gameState.score = 0;
        gameState.combo = 0;
    } else {
        gameState.combo = 0;
    }
    
    updateHUD();
    
    // show near score (pass null for noteElement so it uses score position)
    showPointsIndicator(-penalty, null);
}

// HUD Updates
function updateHUD() {
    // Update score immediately with visual feedback
    // Ensure score is displayed as a number (not NaN or undefined)
    const displayScore = isNaN(gameState.score) ? 0 : Math.max(0, gameState.score);
    scoreEl.textContent = displayScore;
    comboEl.textContent = gameState.combo || 0;
    
    // Add visual feedback for score change
    scoreEl.style.transform = 'scale(1.2)';
    scoreEl.style.transition = 'transform 0.2s ease';
    setTimeout(() => {
        scoreEl.style.transform = 'scale(1)';
    }, 200);
}

function showPointsIndicator(points, noteElement) {
    // Create a floating points indicator
    const indicator = document.createElement('div');
    indicator.className = 'points-indicator';
    indicator.textContent = points > 0 ? `+${points}` : `${points}`;
    indicator.style.position = 'absolute';
    indicator.style.color = '#000';
    indicator.style.fontSize = '24px';
    indicator.style.fontWeight = 'bold';
    indicator.style.pointerEvents = 'none';
    indicator.style.zIndex = '1000';
    indicator.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
    
    // Position near the note or score display
    if (noteElement && noteElement.parentNode) {
        const rect = noteElement.getBoundingClientRect();
        indicator.style.left = `${rect.left + rect.width / 2}px`;
        indicator.style.top = `${rect.top}px`;
    } else {
        // Position near score display
        const scoreRect = scoreEl.getBoundingClientRect();
        indicator.style.left = `${scoreRect.right + 20}px`;
        indicator.style.top = `${scoreRect.top}px`;
    }
    
    document.body.appendChild(indicator);
    
    // Animate upward and fade out
    indicator.style.transition = 'all 0.8s ease-out';
    setTimeout(() => {
        indicator.style.transform = 'translateY(-50px)';
        indicator.style.opacity = '0';
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 800);
}

// End Game
function endGame() {
    // Remember which mode we just played
    const modeAtEnd = currentMode;
    
    // Stop audio & clear notes, but keep the mode so we can show reflection + replay
    stopGame({ keepMode: true });

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
    const config = modeConfigs[modeAtEnd];
    reflectionTextEl.innerHTML = `
        <p style="margin-bottom: 1rem; font-size: 1.2rem; font-weight: bold;">Reflection: ${config.name} Mode</p>
        <p style="margin-bottom: 0.5rem;">Did this rhythm feel natural or forced?</p>
        <p style="margin-bottom: 0.5rem;">Which rhythm felt the most natural to you?</p>
        <p style="font-size: 0.95rem; color: #000; margin-top: 1rem;">Consider: Does harmony come from exactness, balance, or letting go? What does it mean to act in harmony with the Way?</p>
    `;

    // Clear any leftover notes
    document.querySelectorAll('.note').forEach(note => note.remove());
    gameState.notes = [];

    showScreen('result');
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);

