// Global Error Handler
window.addEventListener('error', function(e) {
    alert("CRASH LOG: " + e.message + "\nLine: " + e.lineno);
});

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let lastTime = 0;

// Config
const GRID_SIZE = 90;  
const DRAW_SIZE = 180; 

// Web Audio API Synth (For Retro SFX)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol=0.1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playEnvelopeSound() { playTone(500, 'triangle', 0.1, 0.1); setTimeout(() => playTone(800, 'triangle', 0.3, 0.1), 100); }
function playTypeSound() { playTone(300 + Math.random()*50, 'square', 0.05, 0.03); }

// Audio elements
const audioPlayers = [
    document.getElementById('music1'),
    document.getElementById('music2'),
    document.getElementById('music3')
];
let currentAudio = null;
let loopAudio = true;
function playTapeSelectSound() {
    playTone(400, 'sine', 0.05, 0.08);
    setTimeout(() => playTone(600, 'sine', 0.05, 0.08), 50);
    setTimeout(() => playTone(800, 'triangle', 0.1, 0.08), 100);
}

// SFX MP3s
const sfxWalk = document.getElementById('sfxWalk');
const sfxJump = document.getElementById('sfxJump');
const sfxBatHit = document.getElementById('sfxBatHit');

let sfxClarenceRun = null;
if (sfxWalk) {
    sfxClarenceRun = sfxWalk.cloneNode();
    sfxClarenceRun.playbackRate = 2.0;
    sfxClarenceRun.loop = true;
}

// Standard Image Loader
const images = {
    grass: new Image(),
    tree: new Image(),
    envelope: new Image(),
    playerIdle: new Image(),
    playerWalk1: new Image(),
    playerWalk2: new Image(),
    playerJump: new Image(),
    bat1: new Image(),
    bat2: new Image(),
    bat3: new Image(),
    beaten: new Image(),
    pic1: new Image(),
    pic2: new Image(),
    pic3: new Image(),
    pic4: new Image(),
    pic5: new Image(),
    pic6: new Image()
};

images.grass.src = 'grass.png';
images.tree.src = 'grass_with_tree.png';
images.envelope.src = 'envelope.png';
images.playerIdle.src = 'player_idle.png';
images.playerWalk1.src = 'player_walk1.png';
images.playerWalk2.src = 'player_walk2.png';
images.playerJump.src = 'player_jump.png';
images.bat1.src = 'bat1.png';
images.bat2.src = 'bat2.png';
images.bat3.src = 'bat3.png';
images.beaten.src = 'beaten.png';
images.pic1.src = 'pic1.png';
images.pic2.src = 'pic2.png';
images.pic3.src = 'pic3.png';
images.pic4.src = 'pic4.png';
images.pic5.src = 'pic5.png';
images.pic6.src = 'pic6.png';

// State
let gameState = 'intro'; // intro, playing, reading, celebrating, cassette, celebration_wait, pic_chase, pic_reading
let lettersFound = 0;
let picsFound = 0;
const totalLetters = 8;
const totalPics = 6;
const messages = [
    "Mahal, happy monthsary to us. I can't believe ang tagal na natin. I'm thankful hanggang ngayon kasi sinagot mo ako. I'm proud of us. Despite every battle we faced, we're still here for each other.",
    "I see you. I see your efforts towards me. I see that you care for me and love me. Salamat sa lahat. Walang kulang sa'yo, lahat ibinigay mo kaya thankful ako at mahal na mahal kita. I'm beyond grateful.",
    "Every day, I find more reasons to love you. Sa maliliit na bagay, sa mga random na usapan natin, sa mga moments na tayo lang nakakaintindi. You make my days brighter, and having you in my life is one of the best things that ever happened to me I LOVE YOU mwehehhe.",
    "You know what's funny? If I had the chance to choose all over again, I'd still choose you. Not because you're perfect, not because of what you do for me, but simply because you're you. Out of everyone in this world, you're the person I want beside me.",
    "You're my comfort, my safe place, and the reason why so many things feel worth it. You're my why.",
    "Thank you for being yourself. Thank you for being the person I fell in love with. Mahal na mahal kita, and I'd choose you every single time.",
    "Mahal, one thing I want you to always remember is that I didn't choose you because of what you could give me. I chose you because you're you. Your smile, your personality, your heart, your little habits, your flaws, and everything that makes you who you are.",
    "Thank you for being my person, my comfort, and my happiness. More monthsaries to come, mahal. More adventures, more laughter, more growth, and hopefully a lifetime of us. I love you always and in all ways."
];

const picMessages = [
    "Cuties together",
    "You are my sunshine",
    "Best day ever with my love",
    "I will always cherish this",
    "Look how happy we are",
    "Forever mine"
];

// Player
const player = {
    x: 0,
    y: 0,
    width: 64, 
    height: 65,
    speed: 300,
    vx: 0,
    vy: 0,
    jumpTimer: 0,
    jumpCooldown: 0,
    jumpCount: 0, // For celebration
    name: "Bunbun",
    animFrame: 0,
    animTimer: 0,
    facingRight: true
};

// Bots Setup
let bots = [];
let clarenceSpawned = false;
function initBots() {
    bots = [];
    for(let i=0; i<6; i++) {
        bots.push({
            type: 'wanderer',
            x: Math.random() * 2000 - 1000,
            y: Math.random() * 2000 - 1000,
            vx: 0, vy: 0,
            speed: 100 + Math.random() * 100,
            jumpTimer: 0,
            animFrame: 0,
            animTimer: 0,
            facingRight: true,
            moveTimer: 0
        });
    }
}
initBots();

// Camera
const camera = { x: 0, y: 0 };

// Envelope
const envelope = { x: 0, y: 0, width: 64, height: 64, active: false };

// Input
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, " ": false };
const joystick = { active: false, dx: 0, dy: 0 };
let isJumpBtnPressed = false;

// Resize
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Intro Screen Logic

document.getElementById('startBtn').addEventListener('click', () => {
    initAudio(); 
    document.getElementById('introScreen').classList.add('hidden');
    gameState = 'playing';
    spawnEnvelope();
});

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    initAudio();
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false;
});

// Jump Button Logic
const jumpBtn = document.getElementById('jumpBtn');
jumpBtn.addEventListener('mousedown', () => { initAudio(); isJumpBtnPressed = true; });
jumpBtn.addEventListener('mouseup', () => isJumpBtnPressed = false);
jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); isJumpBtnPressed = true; }, {passive: false});
jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); isJumpBtnPressed = false; });
jumpBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); isJumpBtnPressed = false; });

// Joystick Logic
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
let touchId = null;

joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    touchId = e.changedTouches[0].identifier;
    joystick.active = true;
    updateJoystick(e.changedTouches[0]);
}, {passive: false});

joystickBase.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
            updateJoystick(e.changedTouches[i]);
            break;
        }
    }
}, {passive: false});

joystickBase.addEventListener('touchend', endJoystick);
joystickBase.addEventListener('touchcancel', endJoystick);

let mouseJoyActive = false;
joystickBase.addEventListener('mousedown', (e) => {
    mouseJoyActive = true;
    initAudio();
    joystick.active = true;
    updateJoystick(e);
});
window.addEventListener('mousemove', (e) => {
    if(mouseJoyActive) updateJoystick(e);
});
window.addEventListener('mouseup', () => {
    if(mouseJoyActive) endJoystick();
    mouseJoyActive = false;
});

function endJoystick(e) {
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    joystickStick.style.transform = `translate(-50%, -50%)`;
}

function updateJoystick(evt) {
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = evt.clientX - centerX;
    let dy = evt.clientY - centerY;
    
    const distance = Math.hypot(dx, dy);
    const maxDist = rect.width / 2 - 25; 
    
    if (distance > maxDist) {
        dx = (dx / distance) * maxDist;
        dy = (dy / distance) * maxDist;
    }
    
    joystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joystick.dx = dx / maxDist;
    joystick.dy = dy / maxDist;
}

// Math utils
function pseudoRandom(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

// Game Logic
function spawnEnvelope() {
    if (lettersFound >= totalLetters) return;
    const angle = Math.random() * Math.PI * 2;
    const distance = 1000 + Math.random() * 800; // Farther Spawn
    envelope.x = player.x + Math.cos(angle) * distance;
    envelope.y = player.y + Math.sin(angle) * distance;
    envelope.active = true;

    // Spawn 1 Guardian Bot near Envelope
    bots.push({
        type: 'guardian',
        guardianState: 'guarding',
        x: envelope.x + (Math.random() - 0.5) * 600,
        y: envelope.y + (Math.random() - 0.5) * 600,
        vx: 0, vy: 0,
        speed: player.speed * 0.5, // Slower than player by half
        jumpTimer: 0,
        animFrame: 0,
        animTimer: 0,
        facingRight: true,
        moveTimer: 0
    });
}

function checkCollisions() {
    if (gameState === 'pic_chase') {
        bots.forEach(b => {
            if (b.type === 'pic_thief' && b.stunTimer > 0) {
                const dx = (player.x + player.width/2) - (b.x + player.width/2);
                const dy = (player.y + player.height/2) - (b.y + player.height/2);
                const distance = Math.hypot(dx, dy);
                if (distance < player.width) {
                    gameState = 'pic_reading';
                    if (document.getElementById('picDisplay')) document.getElementById('picDisplay').src = `pic${b.picIndex}.png`;
                    if (document.getElementById('picMessage')) document.getElementById('picMessage').textContent = picMessages[b.picIndex - 1];
                    if (document.getElementById('picPopup')) document.getElementById('picPopup').classList.remove('hidden');
                    playEnvelopeSound();
                    player.vx = 0; player.vy = 0;
                }
            }
        });
    }

    if (!envelope.active) return;
    const dx = (player.x + player.width/2) - (envelope.x + envelope.width/2);
    const dy = (player.y + player.height/2) - (envelope.y + envelope.height/2);
    const distance = Math.hypot(dx, dy);
    
    if (distance < (player.width/2 + envelope.width/2)) {
        envelope.active = false;
        
        // Make all guarding bots angry
        bots.forEach(b => {
            if (b.type === 'guardian' && b.guardianState === 'guarding') {
                b.guardianState = 'angry';
                b.speed = player.speed * 0.8; // Faster!
                b.chatMessage = "Why did you read it?!";
                b.chatTimer = 3.0;
            }
        });
        
        player.jumpTimer = 1; 
        gameState = 'reading';
        playEnvelopeSound();
        
        setTimeout(() => {
            showLetter(messages[lettersFound]);
            lettersFound++;
            document.getElementById('letterCount').innerText = lettersFound;
            
            if (lettersFound === 5 && !clarenceSpawned) {
                clarenceSpawned = true;
                bots.push({
                    type: 'protector',
                    name: 'Clarence',
                    x: player.x - 60,
                    y: player.y - 60,
                    vx: 0, vy: 0,
                    speed: player.speed * 1.2,
                    jumpTimer: 0,
                    animFrame: 0,
                    animTimer: 0,
                    facingRight: true,
                    moveTimer: 0,
                    chatMessage: "Hi po mahal! sorry I'm late, nag code pa kasi ako.",
                    chatTimer: 12.0
                });
            }
        }, 500);
    }
}

let typeWriterTimer = null;
function showLetter(message) {
    document.getElementById('letterPopup').classList.remove('hidden');
    const content = document.getElementById('letterContent');
    content.textContent = '';
    let index = 0;
    
    if (typeWriterTimer) clearInterval(typeWriterTimer);
    
    typeWriterTimer = setInterval(() => {
        content.textContent += message.charAt(index);
        playTypeSound();
        index++;
        if (index >= message.length) {
            clearInterval(typeWriterTimer);
        }
    }, 50);
}

document.getElementById('closeLetterBtn').addEventListener('click', () => {
    document.getElementById('letterPopup').classList.add('hidden');
    if (typeWriterTimer) clearInterval(typeWriterTimer);
    
    updateBackpackUI();
    
    if (gameState === 'backpack') return; // if opened from backpack, do nothing
    
    if (lettersFound >= totalLetters && gameState !== 'pic_chase' && gameState !== 'pic_chase_intro' && gameState !== 'celebration_wait') {
        const pc = document.getElementById('picCounter');
        if (pc) pc.classList.remove('hidden');
        gameState = 'pic_chase_intro';
        
        // Stun all guardians permanently instead of removing them
        bots.forEach(b => {
            if (b.type === 'guardian') {
                b.guardianState = 'stunned';
                b.stunTimer = 999999; // Never wake up
                b.chatMessage = null;
            }
            if (b.type === 'protector') {
                b.chatMessage = "Wow mahal! Ang galing natin!";
                b.chatTimer = 3.0;
            }
        });
        
        setTimeout(() => {
            gameState = 'pic_chase';
            spawnPicThief();
        }, 3000);
    } else if (gameState === 'reading') {
        gameState = 'playing';
        spawnEnvelope();
    }
});

function spawnPicThief() {
    if (picsFound >= totalPics) {
        gameState = 'celebration_sequence';
        player.vx = 0;
        player.vy = 0;
        
        bots.forEach(b => {
            if (b.type === 'protector') {
                b.vx = 0; b.vy = 0;
                b.attackTarget = null;
                b.chatMessage = null;
                b.celebPhase = 0;
                b.celebTimer = 0;
            }
        });
        return;
    }
    
    let angle = Math.random() * Math.PI * 2;
    let spawnDistance = 500;
    
    // Reset Clarence chase state for new thief
    bots.forEach(b => {
        if (b.type === 'protector') {
            b.chaseTimer = 10.0;
            b.jumpedInChase = false;
        }
    });
    
    bots.push({
        type: 'pic_thief',
        x: player.x + Math.cos(angle) * spawnDistance,
        y: player.y + Math.sin(angle) * spawnDistance,
        vx: 0,
        vy: 0,
        speed: player.speed * 0.8,
        jumpTimer: 0,
        animFrame: 0,
        animTimer: 0,
        facingRight: true,
        picIndex: picsFound + 1,
        stunTimer: 0,
        chatMessage: "No way this is mine!",
        chatTimer: 4.0
    });
}

document.getElementById('closePicBtn').addEventListener('click', () => {
    document.getElementById('picPopup').classList.add('hidden');
    
    if (gameState === 'backpack') return; // opened from backpack
    
    picsFound++;
    document.getElementById('picCount').innerText = picsFound;
    
    // Remove the stunned thief
    bots = bots.filter(b => b.type !== 'pic_thief');
    
    updateBackpackUI();
    
    gameState = 'pic_chase';
    spawnPicThief();
});

// Backpack UI Logic
const backpackIcon = document.getElementById('backpackContainer');
const backpackPopup = document.getElementById('backpackPopup');
const closeBackpackBtn = document.getElementById('closeBackpackBtn');
const tabEnvelopes = document.getElementById('tabEnvelopes');
const tabPics = document.getElementById('tabPics');
const gridEnvelopes = document.getElementById('backpackGridEnvelopes');
const gridPics = document.getElementById('backpackGridPics');
let previousGameState = 'playing';

backpackIcon.addEventListener('click', () => {
    previousGameState = gameState;
    gameState = 'backpack';
    backpackPopup.classList.remove('hidden');
    updateBackpackUI();
});

closeBackpackBtn.addEventListener('click', () => {
    backpackPopup.classList.add('hidden');
    gameState = previousGameState;
});

tabEnvelopes.addEventListener('click', () => {
    tabEnvelopes.classList.add('active');
    tabPics.classList.remove('active');
    gridEnvelopes.classList.remove('hidden');
    gridPics.classList.add('hidden');
});

tabPics.addEventListener('click', () => {
    tabPics.classList.add('active');
    tabEnvelopes.classList.remove('active');
    gridPics.classList.remove('hidden');
    gridEnvelopes.classList.add('hidden');
});

function updateBackpackUI() {
    gridEnvelopes.innerHTML = '';
    for (let i = 0; i < lettersFound; i++) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `<img src="envelope.png"><br>Letter ${i+1}`;
        item.onclick = () => {
            document.getElementById('letterContent').textContent = messages[i];
            document.getElementById('letterPopup').classList.remove('hidden');
        };
        gridEnvelopes.appendChild(item);
    }
    
    gridPics.innerHTML = '';
    for (let i = 0; i < picsFound; i++) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `<img src="pic${i+1}.png"><br>Pic ${i+1}`;
        item.onclick = () => {
            document.getElementById('picDisplay').src = `pic${i+1}.png`;
            document.getElementById('picMessage').textContent = picMessages[i];
            document.getElementById('picPopup').classList.remove('hidden');
        };
        gridPics.appendChild(item);
    }
}

function showCelebration() {
    gameState = 'celebrating';
    document.getElementById('celebrationScreen').classList.remove('hidden');
    spawnHearts();
}

function spawnHearts() {
    if (gameState !== 'celebrating') return;
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.className = 'heart';
    heart.style.left = Math.random() * 100 + 'vw';
    heart.style.bottom = '-20px';
    const size = 15 + Math.random() * 30;
    heart.style.fontSize = `${size}px`;
    const duration = 2 + Math.random() * 3;
    heart.style.animationDuration = `${duration}s`;
    document.getElementById('celebrationScreen').appendChild(heart);
    setTimeout(() => heart.remove(), duration * 1000);
    setTimeout(spawnHearts, 300);
}

document.getElementById('playAgainBtn').addEventListener('click', () => {
    lettersFound = 0;
    document.getElementById('letterCount').innerText = lettersFound;
    document.getElementById('celebrationScreen').classList.add('hidden');
    gameState = 'playing';
    player.x = 0;
    player.y = 0;
    initBots(); // Reset to base wanderers
    spawnEnvelope();
});

// Cassette UI Logic
const cassetteIcon = document.getElementById('cassetteIcon');
const bigCassettePopup = document.getElementById('bigCassettePopup');
const closeCassetteBtn = document.getElementById('closeCassetteBtn');
const insertedTape = document.getElementById('insertedTape');
const cassetteTray = document.getElementById('cassetteTray');
const cassettePlayMe = document.getElementById('cassettePlayMe');

cassetteIcon.addEventListener('click', () => {
    gameState = 'cassette';
    bigCassettePopup.classList.remove('hidden');
    setTimeout(() => cassetteTray.classList.add('open'), 100);
});

closeCassetteBtn.addEventListener('click', () => {
    cassetteTray.classList.remove('open');
    setTimeout(() => {
        bigCassettePopup.classList.add('hidden');
        gameState = 'playing';
    }, 400);
});

const tapePickWrappers = document.querySelectorAll('.tape-wrapper');
tapePickWrappers.forEach(wrapper => {
    wrapper.addEventListener('click', () => {
        const track = wrapper.getAttribute('data-track');
        
        playTapeSelectSound();
        
        insertedTape.classList.remove('inserted', 'playing');
        cassetteTray.classList.add('open');
        
        setTimeout(() => {
            insertedTape.classList.remove('hidden');
            insertedTape.classList.add('inserted');
            
            setTimeout(() => {
                cassetteTray.classList.remove('open');
                
                setTimeout(() => {
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                    }
                    
                    currentAudio = audioPlayers[track - 1];
                    currentAudio.volume = 0.8;
                    currentAudio.loop = true;
                    
                    currentAudio.play().then(() => {
                        insertedTape.classList.add('playing');
                        cassettePlayMe.classList.add('hidden'); // Hide mini PLAY ME
                    }).catch(e => console.log("Audio blocked"));
                }, 500); 
            }, 400); 
        }, 300);
    });
});

// Update & Render Loop
function update(dt) {
    if (gameState === 'celebration_sequence') {
        player.vx = 0;
        player.vy = 0;
        
        bots.forEach(b => {
            if (b.type === 'protector') {
                const targetX = player.x - 60;
                const targetY = player.y;
                const dx = targetX - b.x;
                const dy = targetY - b.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist > 5) {
                    b.vx = dx / dist;
                    b.vy = dy / dist;
                    b.speed = player.speed;
                } else {
                    b.x = targetX;
                    b.y = targetY;
                    b.vx = 0;
                    b.vy = 0;
                    b.facingRight = true; 
                    player.facingRight = false;
                    
                    b.celebTimer -= dt;
                    if (b.celebTimer <= 0) {
                        if (b.celebPhase === 0) {
                            b.chatMessage = "Mahal na mahal kita princess";
                            b.chatTimer = 3.0;
                            b.celebTimer = 3.5;
                            b.celebPhase++;
                        } else if (b.celebPhase === 1) {
                            b.chatMessage = "Happy monthsary to us";
                            b.chatTimer = 3.0;
                            b.celebTimer = 3.5;
                            b.celebPhase++;
                        } else if (b.celebPhase === 2) {
                            b.chatMessage = "I LOVE YOU ALWAYS - IN ALL WAYS.";
                            b.chatTimer = 3.0;
                            b.celebTimer = 3.5;
                            b.celebPhase++;
                        } else if (b.celebPhase === 3) {
                            b.chatMessage = "*kisses you* 💋";
                            b.chatTimer = 3.0;
                            b.celebTimer = 3.5;
                            b.celebPhase++;
                        } else if (b.celebPhase === 4) {
                            gameState = 'celebration_wait';
                            player.jumpCount = 0;
                            player.jumpCooldown = 0.5;
                            b.chatMessage = null;
                        }
                    }
                }
                
                if (b.vx < 0) b.facingRight = false;
                else if (b.vx > 0) b.facingRight = true;
                
                b.x += b.vx * b.speed * dt;
                b.y += b.vy * b.speed * dt;
                
                if (b.chatTimer > 0) {
                    b.chatTimer -= dt;
                    if (b.chatTimer <= 0) b.chatMessage = null;
                }
            }
        });
        return;
    }

    if (gameState === 'celebration_wait') {
        player.vx = 0;
        player.vy = 0;
        
        if (player.jumpCooldown > 0) player.jumpCooldown -= dt;

        if (player.jumpTimer <= 0 && player.jumpCooldown <= 0) {
            if (player.jumpCount < 5) {
                player.jumpTimer = 0.5; // Jump
                
                bots.forEach(b => {
                    if (b.type === 'protector') {
                        b.jumpTimer = 0.5;
                        b.facingRight = (b.x < player.x);
                    }
                });
                
                player.jumpCooldown = 1.0; // 1-second delay
                player.jumpCount++;
                if (sfxJump.readyState >= 2) {
                    sfxJump.currentTime = 0;
                    sfxJump.play().catch(e=>console.log(e));
                }
            } else {
                // 5 jumps completed
                showCelebration();
            }
        }
        
        if (player.jumpTimer > 0) {
            player.jumpTimer -= dt * 2;
            if (player.jumpTimer < 0) player.jumpTimer = 0;
        }
        bots.forEach(b => {
            if (b.type === 'protector' && b.jumpTimer > 0) {
                b.jumpTimer -= dt * 2;
                if (b.jumpTimer < 0) b.jumpTimer = 0;
            }
        });
        return;
    }

    if (gameState !== 'playing' && gameState !== 'pic_chase' && gameState !== 'pic_chase_intro' && gameState !== 'celebration_sequence') {
        if (!sfxWalk.paused) sfxWalk.pause();
        return;
    }

    player.vx = 0;
    player.vy = 0;

    if (keys.w || keys.ArrowUp) player.vy = -1;
    if (keys.s || keys.ArrowDown) player.vy = 1;
    if (keys.a || keys.ArrowLeft) player.vx = -1;
    if (keys.d || keys.ArrowRight) player.vx = 1;

    if (joystick.active) {
        player.vx = joystick.dx;
        player.vy = joystick.dy;
    }

    if (player.vx < 0) player.facingRight = false;
    else if (player.vx > 0) player.facingRight = true;

    const isMoving = player.vx !== 0 || player.vy !== 0;

    if (isMoving && !joystick.active) {
        const length = Math.hypot(player.vx, player.vy);
        player.vx /= length;
        player.vy /= length;
    }

    // Bots AI logic
    const isClarenceAttacking = bots.some(b => b.type === 'protector' && b.attackTimer > 0);
    
    bots.forEach(b => {
        if (b.type === 'guardian') {
            if (isClarenceAttacking) {
                b.vx = 0;
                b.vy = 0;
                return; // Stop moving while Clarence attacks
            }
            
            if (b.stunTimer > 0) {
                b.stunTimer -= dt;
                b.vx = 0;
                b.vy = 0;
                if (b.stunTimer <= 0) {
                    b.guardianState = 'angry';
                }
                return; // skip rest of AI while stunned
            }
            
            const distToPlayer = Math.hypot(player.x - b.x, player.y - b.y);
            
            if (b.guardianState === 'angry') {
                // Chase continuously and faster
                const dx = player.x - b.x;
                const dy = player.y - b.y;
                b.vx = dx / distToPlayer;
                b.vy = dy / distToPlayer;
                
                if (Math.random() < 0.01 && !b.chatMessage) {
                    const angryMessages = [
                        "Why did you read it?!",
                        "That was mine!",
                        "I'm so angry!",
                        "Give it back!",
                        "You shouldn't have done that!"
                    ];
                    b.chatMessage = angryMessages[Math.floor(Math.random() * angryMessages.length)];
                    b.chatTimer = 3.0;
                }
            } else {
                // Guarding state
                const distToEnvelope = Math.hypot(envelope.x - b.x, envelope.y - b.y);
                const playerDistToEnvelope = Math.hypot(player.x - envelope.x, player.y - envelope.y);
                
                // Only chase if player is near the envelope (e.g. within 600px of envelope)
                if (playerDistToEnvelope < 600 && distToPlayer < 900) {
                    const dx = player.x - b.x;
                    const dy = player.y - b.y;
                    b.vx = dx / distToPlayer;
                    b.vy = dy / distToPlayer;
                    
                    if (distToPlayer < 350 && !b.chatMessage) {
                        const goofyMessages = [
                            "Go away!",
                            "Don't come here, please!",
                            "Mahal said NO!",
                            "Shoo! Shoo!",
                            "I'm telling!",
                            "Danger! Love zone!",
                            "Back off, human!",
                            "No letters for you!",
                            "Hey! Stop that!",
                            "Keep distance!",
                            "Not allowed!",
                            "Get your own love!"
                        ];
                        b.chatMessage = goofyMessages[Math.floor(Math.random() * goofyMessages.length)];
                        b.chatTimer = 2.5; 
                    }
                } else {
                    // Stay near envelope or return to it
                    if (distToEnvelope > 100) {
                        const dx = envelope.x - b.x;
                        const dy = envelope.y - b.y;
                        b.vx = dx / distToEnvelope;
                        b.vy = dy / distToEnvelope;
                    } else {
                        b.vx = 0; 
                        b.vy = 0;
                    }
                }
            }
            
            if (b.chatTimer > 0) {
                b.chatTimer -= dt;
                if (b.chatTimer <= 0) {
                    b.chatMessage = null; // Reset for next trigger
                }
            }
        } else if (b.type === 'protector') {
            // Target acquisition
            let target = null;
            let minDist = 800;
            
            if (gameState === 'pic_chase') {
                if (b.chaseTimer === undefined) {
                    b.chaseTimer = 10.0;
                    b.jumpedInChase = false;
                }
                b.chaseTimer -= dt;
                
                if (b.chaseTimer > 0) {
                    b.speed = player.speed * 0.7; // Slow chase initially
                } else {
                    if (!b.jumpedInChase) {
                        b.jumpTimer = 0.5; // Jump
                        b.jumpedInChase = true;
                    }
                    b.speed = player.speed * 1.8; // Old speed + more
                }
                
                bots.forEach(other => {
                    if (other.type === 'pic_thief' && (!other.stunTimer || other.stunTimer <= 0)) {
                        const d = Math.hypot(b.x - other.x, b.y - other.y);
                        if (d < minDist) {
                            minDist = d;
                            target = other;
                        }
                    }
                });
            } else {
                b.speed = player.speed * 1.2;
                bots.forEach(other => {
                    if (other.type === 'guardian' && (!other.stunTimer || other.stunTimer <= 0)) {
                        const d = Math.hypot(player.x - other.x, player.y - other.y);
                        if (d < minDist) {
                            minDist = d;
                            target = other;
                        }
                    }
                });
            }
            
            if (b.attackTimer > 0) {
                b.attackTimer -= dt;
                
                // Play audio on bat2 (timer <= 0.30)
                if (b.attackTimer <= 0.30 && !b.audioPlayed) {
                    b.audioPlayed = true;
                    if (sfxBatHit && sfxBatHit.readyState >= 2) {
                        sfxBatHit.currentTime = 0; // Removed timestamp start
                        sfxBatHit.play().catch(e=>console.log(e));
                    }
                }
                
                // Stun on bat3 (timer <= 0.15)
                if (b.attackTimer <= 0.15 && !b.stunApplied) {
                    b.stunApplied = true;
                    if (b.attackTarget && (!b.attackTarget.stunTimer || b.attackTarget.stunTimer <= 0)) {
                        b.attackTarget.stunTimer = 999999; // Stun permanently!
                        b.attackTarget.guardianState = 'stunned';
                    }
                }
            }
            
            if (target) {
                // Head towards the enemy to intercept
                const dx = target.x - b.x;
                const dy = target.y - b.y;
                const distToTarget = Math.hypot(dx, dy);
                
                if (b.attackTimer > 0) {
                    // Stop moving while attacking
                    b.vx = 0;
                    b.vy = 0;
                } else if (distToTarget > 0) {
                    b.vx = dx / distToTarget;
                    b.vy = dy / distToTarget;
                }
                
                // Swing bat
                if (b.shootTimer === undefined) b.shootTimer = 3.0;
                b.shootTimer -= dt;
                
                const canHit = (gameState === 'pic_chase') ? (b.chaseTimer <= 0) : true;
                
                if (b.shootTimer <= 0 && (!b.attackTimer || b.attackTimer <= 0) && canHit) {
                    if (distToTarget < 70) { // Hitbox distance
                        b.attackTimer = 0.45; // 0.45 seconds of attack animation (faster)
                        b.attackTarget = target;
                        b.audioPlayed = false;
                        b.stunApplied = false;
                        b.shootTimer = 3.0;
                    } else {
                        b.shootTimer = 0; // Wait until close
                    }
                }
                
                // Talk protective words
                if (Math.random() < 0.02 && !b.chatMessage) {
                    if (gameState === 'pic_chase') {
                        const chaseMsgs = [
                            "Hey wag ka tumakbo!",
                            "Ibigay mo yan sa bebe ko!",
                            "Layuan nyo bebe ko!",
                            "Ang bilis nya love pero mas mabilis ako labasan",
                            "heyyyy hampasin kita",
                            "baby pag na habol ko sya pa hipo po ah"
                        ];
                        b.chatMessage = chaseMsgs[Math.floor(Math.random() * chaseMsgs.length)];
                    } else {
                        const protectiveMessages = [
                            "back, wag nyo guluhin mahal ko",
                            "layuan nyo si Bunbun!",
                            "wag mo siyang hawakan!",
                            "I got you!",
                            "ako bahala sa kanila, mahal!",
                            "back off, she's mine!",
                            "take this bat!",
                            "stay away!",
                            "leave us alone!"
                        ];
                        b.chatMessage = protectiveMessages[Math.floor(Math.random() * protectiveMessages.length)];
                    }
                    b.chatTimer = 3.0;
                }
            } else {
                // Follow the player
                const dx = player.x - b.x;
                const dy = player.y - b.y;
                const distToPlayer = Math.hypot(dx, dy);
                if (distToPlayer > 80) {
                    b.vx = dx / distToPlayer;
                    b.vy = dy / distToPlayer;
                } else {
                    b.vx = 0;
                    b.vy = 0;
                }
            }
            
            if (b.chatTimer > 0) {
                b.chatTimer -= dt;
                if (b.chatTimer <= 0) {
                    b.chatMessage = null; // Reset for next trigger
                }
            }
        } else if (b.type === 'pic_thief') {
            if (b.stunTimer > 0) {
                b.stunTimer -= dt;
                b.vx = 0; b.vy = 0;
            } else {
                const isBeingAttacked = bots.some(other => other.type === 'protector' && other.attackTimer > 0 && other.attackTarget === b);
                if (isBeingAttacked) {
                    b.vx = 0;
                    b.vy = 0;
                } else {
                const isClarenceRapid = bots.some(other => other.type === 'protector' && other.chaseTimer !== undefined && other.chaseTimer <= 0);
                
                let distToThreat = Math.hypot(b.x - player.x, b.y - player.y);
                let closestThreat = player;
                bots.forEach(other => {
                    if (other.type === 'protector') {
                        const d = Math.hypot(b.x - other.x, b.y - other.y);
                        if (d < distToThreat) {
                            distToThreat = d;
                            closestThreat = other;
                        }
                    }
                });
                
                if (distToThreat < 200) {
                    if (b.jumpTimer <= 0 && !isClarenceRapid && (b.evadeCooldown || 0) <= 0) {
                        b.jumpTimer = 0.8;
                        b.evadeCooldown = 2.0;
                        if (sfxJump.readyState >= 2) {
                            sfxJump.currentTime = 0;
                            sfxJump.play().catch(e=>console.log(e));
                        }
                    }
                    const len = Math.hypot(b.x - closestThreat.x, b.y - closestThreat.y);
                    if (len > 0) {
                        b.vx = (b.x - closestThreat.x) / len;
                        b.vy = (b.y - closestThreat.y) / len;
                    }
                }
                
                if (b.evadeCooldown > 0) b.evadeCooldown -= dt;
                
                if (!isClarenceRapid && b.jumpTimer > 0) {
                    b.speed = player.speed * 2.5;
                } else {
                    b.speed = player.speed * 0.8;
                }
                
                if (distToThreat >= 200) {
                    // Just wander slightly if far
                    b.moveTimer = (b.moveTimer || 0) - dt;
                    if (b.moveTimer <= 0) {
                        b.vx = (Math.random() - 0.5) * 2;
                        b.vy = (Math.random() - 0.5) * 2;
                        const len = Math.hypot(b.vx, b.vy);
                        if (len > 0) { b.vx/=len; b.vy/=len; }
                        b.moveTimer = 2 + Math.random() * 3;
                    }
                }
                
                // Talk
                if (Math.random() < 0.02 && !b.chatMessage) {
                    b.chatMessage = "No way this is mine!";
                    b.chatTimer = 3.0;
                }
            }
            } // ADDED MISSING CLOSING BRACE
            
            if (b.chatTimer > 0) {
                b.chatTimer -= dt;
                if (b.chatTimer <= 0) b.chatMessage = null;
            }
        } else {
            // Wanderer
            b.moveTimer -= dt;
            if (b.moveTimer <= 0) {
                b.vx = (Math.random() - 0.5) * 2;
                b.vy = (Math.random() - 0.5) * 2;
                const len = Math.hypot(b.vx, b.vy);
                if (len > 0) { b.vx/=len; b.vy/=len; }
                b.moveTimer = 2 + Math.random() * 3;
                if (Math.random() > 0.7) b.jumpTimer = 0.5;
            }
        }
        
        if (b.vx < 0) b.facingRight = false;
        else if (b.vx > 0) b.facingRight = true;
        
        b.x += b.vx * b.speed * dt;
        b.y += b.vy * b.speed * dt;
        
        if (b.jumpTimer > 0) {
            b.jumpTimer -= dt * 2;
            if (b.jumpTimer < 0) b.jumpTimer = 0;
        } else {
            if (b.vx !== 0 || b.vy !== 0) {
                b.animTimer += dt;
                if (b.animTimer > 0.2) { 
                    b.animFrame = (b.animFrame === 1) ? 2 : 1;
                    b.animTimer = 0;
                }
            } else {
                b.animFrame = 0;
            }
        }
    });

    // Projectiles removed

    // Handle Collisions (Player <-> Bots)
    bots.forEach(b => {
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 45; // Hitbox radius
        
        if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Bots push stronger: 80% player displacement, 20% bot displacement
            player.x += nx * overlap * 0.8;
            player.y += ny * overlap * 0.8;
            b.x -= nx * overlap * 0.2;
            b.y -= ny * overlap * 0.2;
        }
    });

    // Handle Collisions (Bot <-> Bot)
    for(let i=0; i<bots.length; i++) {
        for(let j=i+1; j<bots.length; j++) {
            const b1 = bots[i];
            const b2 = bots[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = 45;
            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                
                if ((b1.type === 'protector' && b2.type === 'guardian') || (b1.type === 'guardian' && b2.type === 'protector')) {
                    // Protector pushes guardian super hard!
                    const protector = b1.type === 'protector' ? b1 : b2;
                    const guardian = b1.type === 'guardian' ? b1 : b2;
                    const sign = (guardian === b2) ? 1 : -1;
                    guardian.x += nx * overlap * 2.0 * sign;
                    guardian.y += ny * overlap * 2.0 * sign;
                } else {
                    b1.x -= nx * overlap * 0.5;
                    b1.y -= ny * overlap * 0.5;
                    b2.x += nx * overlap * 0.5;
                    b2.y += ny * overlap * 0.5;
                }
            }
        }
    }

    // Jump Cooldown Timer Update & Display Bar
    const fill = document.getElementById('jumpCooldownFill');
    if (player.jumpCooldown > 0) {
        player.jumpCooldown -= dt;
        const pct = Math.max(0, 100 - (player.jumpCooldown / 2.0) * 100);
        fill.style.width = pct + '%';
        fill.style.background = '#e74c3c'; // red
        jumpBtn.style.opacity = '0.7';
    } else {
        fill.style.width = '100%';
        fill.style.background = '#4ade80';
        jumpBtn.style.opacity = '1';
    }

    // Jump / Dash Logic
    if ((keys[' '] || isJumpBtnPressed) && player.jumpTimer <= 0 && player.jumpCooldown <= 0) {
        player.jumpTimer = 0.5; // Jump animation + dash duration
        player.jumpCooldown = 2.0; // 2 seconds cooldown
        
        if (sfxJump.readyState >= 2) {
            sfxJump.currentTime = 0;
            sfxJump.play().catch(e=>console.log(e));
        }
    }

    let currentSpeed = player.speed;
    if (player.jumpTimer > 0) {
        currentSpeed = player.speed * 2.5; // Speed boost while hopping
    }

    player.x += player.vx * currentSpeed * dt;
    player.y += player.vy * currentSpeed * dt;

    // Walk Sound Loop
    if (isMoving && player.jumpTimer <= 0) {
        if (sfxWalk.paused && sfxWalk.readyState >= 2) {
            sfxWalk.play().catch(e=>console.log(e));
        }
    } else {
        if (!sfxWalk.paused) {
            sfxWalk.pause();
        }
    }
    
    // Clarence Rapid Run Sound Loop
    if (sfxClarenceRun) {
        let isClarenceRunning = false;
        bots.forEach(b => {
            if (b.type === 'protector' && gameState === 'pic_chase' && b.chaseTimer <= 0) {
                if (b.vx !== 0 || b.vy !== 0) isClarenceRunning = true;
            }
        });
        
        if (isClarenceRunning) {
            if (sfxClarenceRun.paused && sfxClarenceRun.readyState >= 2) {
                sfxClarenceRun.play().catch(e=>console.log(e));
            }
        } else {
            if (!sfxClarenceRun.paused) sfxClarenceRun.pause();
        }
    }

    // Camera follow
    let targetCamX = player.x - canvas.width / 2 + player.width / 2;
    let targetCamY = player.y - canvas.height / 2 + player.height / 2;
    
    if (gameState === 'celebration_sequence') {
        const protector = bots.find(b => b.type === 'protector');
        if (protector) {
            targetCamX = (player.x + protector.x) / 2 - canvas.width / 2;
            targetCamY = (player.y + protector.y) / 2 - canvas.height / 2;
        }
        camera.x += (targetCamX - camera.x) * 3 * dt;
        camera.y += (targetCamY - camera.y) * 3 * dt;
    } else {
        camera.x = targetCamX;
        camera.y = targetCamY;
    }

    // Animation Timer
    if (player.jumpTimer > 0) {
        player.jumpTimer -= dt * 2;
        if (player.jumpTimer < 0) player.jumpTimer = 0;
    } else {
        if (isMoving) {
            player.animTimer += dt;
            if (player.animTimer > 0.2) { 
                player.animFrame = (player.animFrame === 1) ? 2 : 1;
                player.animTimer = 0;
            }
        } else {
            player.animFrame = 0; // idle
        }
    }

    checkCollisions();
}

let cinematicZoom = 1.0;
let cinematicBars = 0;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let baseZoom = 1.0;
    if (window.innerHeight > window.innerWidth) { // portrait
        baseZoom = 0.45; // zoom out more on mobile
    }

    if (gameState === 'celebration_sequence') {
        cinematicZoom += (1.5 - cinematicZoom) * 2 * 0.016; 
        cinematicBars += (140 - cinematicBars) * 2 * 0.016; 
    } else {
        cinematicZoom = 1.0;
        cinematicBars = 0;
    }
    
    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx, cy);
    
    const finalZoom = cinematicZoom * baseZoom;
    ctx.scale(finalZoom, finalZoom);
    ctx.translate(-cx, -cy);

    // Calculate Grid bounds
    const startCol = Math.floor(camera.x / GRID_SIZE) - 2;
    const endCol = startCol + Math.ceil(canvas.width / GRID_SIZE) + 4;
    const startRow = Math.floor(camera.y / GRID_SIZE) - 2;
    const endRow = startRow + Math.ceil(canvas.height / GRID_SIZE) + 4;

    // 1st Pass: Grass (Heavy Overlap)
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            const screenX = Math.floor(c * GRID_SIZE - camera.x);
            const screenY = Math.floor(r * GRID_SIZE - camera.y);

            if (images.grass.complete && images.grass.naturalWidth > 0) {
                ctx.drawImage(images.grass, screenX, screenY, DRAW_SIZE, DRAW_SIZE);
            }
        }
    }

    // 2nd Pass: Trees (Drawn on top)
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            const prng = pseudoRandom(c, r);
            if (prng > 0.85) {  
                const screenX = Math.floor(c * GRID_SIZE - camera.x);
                const screenY = Math.floor(r * GRID_SIZE - camera.y);
                if (images.tree.complete && images.tree.naturalWidth > 0) {
                    ctx.drawImage(images.tree, screenX, screenY, DRAW_SIZE, DRAW_SIZE);
                }
            }
        }
    }

    // Envelope
    if (envelope.active) {
        const screenX = Math.floor(envelope.x - camera.x);
        const screenY = Math.floor(envelope.y - camera.y);
        const bounce = Math.sin(Date.now() / 200) * 10;
        
        if (images.envelope.complete && images.envelope.naturalWidth > 0) {
            ctx.drawImage(images.envelope, screenX, screenY + bounce, envelope.width, envelope.height);
        }

        // Indicator Arrow
        const dx = envelope.x - player.x;
        const dy = envelope.y - player.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > Math.min(canvas.width, canvas.height) / 2) {
            const angle = Math.atan2(dy, dx);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 40;
            
            ctx.save();
            ctx.translate(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            ctx.rotate(angle);
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "#f1c40f";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(0, 6);
            ctx.lineTo(-12, 6);
            ctx.lineTo(-12, -6);
            ctx.lineTo(0, -6);
            ctx.lineTo(0, -12);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // Draw Projectiles removed

    // Indicator and Catch Text for thief
    if (gameState === 'pic_chase') {
        ctx.save();
        const unscale = 1 / baseZoom; // Keep UI text the same apparent size
        ctx.translate(canvas.width / 2, 60);
        ctx.scale(unscale, unscale);
        
        ctx.fillStyle = "#ff69b4"; // pink
        ctx.font = "18px 'Press Start 2P', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText("Catch the thief!", 0, 0);
        ctx.restore();
        
        const thief = bots.find(b => b.type === 'pic_thief');
        if (thief) {
            const dx = thief.x - player.x;
            const dy = thief.y - player.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > Math.min(canvas.width, canvas.height) / 2) {
                const angle = Math.atan2(dy, dx);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = Math.min(centerX, centerY) - 40;
                
                ctx.save();
                ctx.translate(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
                ctx.rotate(angle);
                
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = "#ff69b4"; // pink
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(0, 12);
                ctx.lineTo(0, 6);
                ctx.lineTo(-12, 6);
                ctx.lineTo(-12, -6);
                ctx.lineTo(0, -6);
                ctx.lineTo(0, -12);
                ctx.closePath();
                
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // Draw Bots
    bots.forEach(b => {
        const bScreenX = Math.floor(b.x - camera.x);
        let bScreenY = Math.floor(b.y - camera.y);

        // Simple frustum cull
        if (bScreenX < -100 || bScreenX > canvas.width + 100 || bScreenY < -100 || bScreenY > canvas.height + 100) return;

        if (b.jumpTimer > 0) {
            bScreenY -= Math.sin(b.jumpTimer * Math.PI) * 40; 
        }

        let bImg = images.playerIdle;
        let drawWidth = player.width;
        let drawHeight = player.height;

        if (b.type === 'protector') {
            drawWidth *= 1.2;
            drawHeight *= 1.2;
            
            // Play bat animation on Clarence when attacking
            if (b.attackTimer > 0) {
                drawWidth *= 1.25;
                drawHeight *= 1.25;
                if (b.attackTimer > 0.30) bImg = images.bat1;
                else if (b.attackTimer > 0.15) bImg = images.bat2;
                else bImg = images.bat3;
            } else if (b.jumpTimer > 0) {
                bImg = images.playerJump;
            } else if (b.animFrame === 1) {
                bImg = images.playerWalk1;
            } else if (b.animFrame === 2) {
                bImg = images.playerWalk2;
            }
        } else {
            if (b.stunTimer > 0) {
                bImg = images.beaten;
                drawWidth *= 1.35;
                drawHeight *= 1.35;
            } else if (b.jumpTimer > 0) {
                bImg = images.playerJump;
            } else if (b.animFrame === 1) {
                bImg = images.playerWalk1;
            } else if (b.animFrame === 2) {
                bImg = images.playerWalk2;
            }
        }

        ctx.save();
        ctx.translate(bScreenX + player.width / 2, bScreenY + player.height / 2);
        if (!b.facingRight) ctx.scale(-1, 1);
        
        // Put filters based on bot type
        if (b.type === 'protector') {
            ctx.filter = 'hue-rotate(260deg) saturate(200%)';
        } else if (b.type === 'pic_thief') {
            ctx.filter = 'hue-rotate(60deg) saturate(300%) sepia(100%)'; // Yellow tint
        }
        
        if (bImg && bImg.complete && bImg.naturalWidth > 0) {
            ctx.drawImage(bImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
        ctx.filter = 'none'; // reset filter
        
        // Draw the held picture for pic_thief
        if (b.type === 'pic_thief') {
            const heldPic = images[`pic${b.picIndex}`];
            if (heldPic && heldPic.complete && heldPic.naturalWidth > 0) {
                const unscale = 1 / baseZoom;
                if (b.stunTimer > 0) {
                    // Draw lying down
                    ctx.save();
                    ctx.translate(drawWidth / 2 - 10, drawHeight / 2 - 5);
                    ctx.scale(unscale, unscale);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(heldPic, -15, -15, 30, 30);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.translate(drawWidth / 4, -drawHeight / 4);
                    ctx.scale(unscale, unscale);
                    ctx.drawImage(heldPic, 0, 0, 30, 30);
                    ctx.restore();
                }
            }
        }
        ctx.restore();

        // Draw Name Tag if bot has a name
        if (b.name) {
            ctx.save();
            const unscale = 1 / baseZoom;
            ctx.translate(bScreenX + player.width / 2, bScreenY - 5);
            ctx.scale(unscale, unscale);
            
            if (b.type === 'protector') {
                ctx.fillStyle = "#add8e6"; // light blue
            } else {
                ctx.fillStyle = "#ffb6c1"; // pink
            }
            ctx.font = "10px 'Press Start 2P', cursive";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(b.name, 0, 0);
            ctx.shadowColor = "transparent";
            ctx.restore();
        }

        // Draw chat bubble if bot has a message
        if (b.chatMessage) {
            ctx.save();
            const unscale = 1 / baseZoom;
            const bx = bScreenX + player.width / 2;
            const by = bScreenY - 15;
            
            ctx.translate(bx, by);
            ctx.scale(unscale, unscale);
            
            ctx.font = "8px 'Press Start 2P', cursive";
            const textWidth = ctx.measureText(b.chatMessage).width;
            const padding = 8;
            const bubbleWidth = textWidth + padding * 2;
            const bubbleHeight = 18;
            
            ctx.fillStyle = b.type === 'protector' ? "rgba(59, 130, 246, 0.95)" : "rgba(255, 105, 180, 0.95)";
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            
            ctx.fillRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight);
            ctx.strokeRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight);
            
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 5);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(5, 0);
            ctx.stroke();
            
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(b.chatMessage, 0, -bubbleHeight / 2);
            ctx.restore();
        }
    });

    // Player Rendering
    const pScreenX = Math.floor(player.x - camera.x);
    let pScreenY = Math.floor(player.y - camera.y);

    if (player.jumpTimer > 0) {
        pScreenY -= Math.sin(player.jumpTimer * Math.PI) * 40; 
    }

    let currentImg = images.playerIdle;
    if (player.jumpTimer > 0) {
        currentImg = images.playerJump;
    } else if (player.animFrame === 1) {
        currentImg = images.playerWalk1;
    } else if (player.animFrame === 2) {
        currentImg = images.playerWalk2;
    }

    ctx.save();
    // Translate to center of player to pivot for flipping
    ctx.translate(pScreenX + player.width / 2, pScreenY + player.height / 2);
    
    if (!player.facingRight) {
        ctx.scale(-1, 1);
    }

    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        ctx.drawImage(currentImg, -player.width / 2, -player.height / 2, player.width, player.height);
    } else {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    }
    
    ctx.restore();

    // Name Tag (drawn after restore so it's never inverted)
    ctx.save();
    const unscale = 1 / baseZoom;
    ctx.translate(pScreenX + player.width / 2, pScreenY - 10);
    ctx.scale(unscale, unscale);
    
    ctx.fillStyle = "#ffb6c1";
    ctx.font = "12px 'Press Start 2P', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(player.name, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.restore();
    
    ctx.restore(); // Restore cinematic zoom
    
    if (cinematicBars > 0) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, cinematicBars); // Top bar
        ctx.fillRect(0, canvas.height - cinematicBars, canvas.width, cinematicBars); // Bottom bar
    }
}

function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

// Start Main Loop (No envelope spawned until Start Button)
requestAnimationFrame(loop);
