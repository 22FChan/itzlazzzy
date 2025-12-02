// Typing Trainer Game
// Uses inline typing, practice list, WPM, and multiple music tracks.

// === CONFIGURATION ===
const MISTAKE_THRESHOLD = 3;
const GAME_DURATION_SECONDS = 60;
const STARTING_LIVES = 10;

// Multiple music tracks – put the MP3s in assets/sounds/
const MUSIC_TRACKS = [
  { name: "Lo-fi Chill", file: "assets/sounds/music1.mp3" },
  { name: "Arcade Rush", file: "assets/sounds/music2.mp3" },
  { name: "Deep Focus", file: "assets/sounds/music3.mp3" },
];

// Fallback words if JSON can't be loaded
const DEFAULT_WORDS = {
  short: [
    "cat",
    "dog",
    "code",
    "play",
    "type",
    "home",
    "fast",
    "word",
    "game",
    "time",
  ],
  long: [
    "keyboard",
    "computer",
    "practice",
    "javascript",
    "browser",
    "accuracy",
    "challenge",
    "programming",
    "language",
    "performance",
    "learning",
    "dynamic",
    "developer",
    "training",
    "session",
  ],
};

// === STATE ===
let mode = "game"; // "game" | "practice"
let difficulty = "any"; // "any" | "short" | "long"

let currentWord = "";
let typedChars = ""; // characters typed for current word

let correctCount = 0;
let wrongCount = 0;
let streak = 0;
let score = 0;
let lives = STARTING_LIVES;

// WPM tracking (correct words per minute)
let startTime = null; // when first word is finished

// Game timer
let gameState = "ready"; // "ready" | "playing" | "gameover"
let remainingTime = GAME_DURATION_SECONDS;
let timerIntervalId = null;

// Word sets loaded from JSON
let WORD_SETS = { short: [], long: [] };
let ALL_WORDS = [];

// Mistakes & practice list
const mistakeCounts = {};
const practiceSet = new Set();

// Music state
let currentTrackIndex = 0;

// === DOM ELEMENTS ===
const wordDisplay = document.getElementById("wordDisplay");
const feedback = document.getElementById("feedback");
const statCorrect = document.getElementById("statCorrect");
const statWrong = document.getElementById("statWrong");
const statAccuracy = document.getElementById("statAccuracy");
const statWpm = document.getElementById("statWpm");
const statTime = document.getElementById("statTime");
const statStreak = document.getElementById("statStreak");
const scoreDisplay = document.getElementById("scoreDisplay");
const heartsDisplay = document.getElementById("hearts");

const modeButtons = document.querySelectorAll(".mode-button");
const practiceWordsContainer = document.getElementById("practiceWordsContainer");
const clearPracticeButton = document.getElementById("clearPracticeButton");
const thresholdInfo = document.getElementById("thresholdInfo");
const difficultySelect = document.getElementById("difficultySelect");
const startGameButton = document.getElementById("startGameButton");
const bgMusic = document.getElementById("bgMusic");
const prevTrackButton = document.getElementById("prevTrackButton");
const nextTrackButton = document.getElementById("nextTrackButton");
const musicToggle = document.getElementById("musicToggle");
const trackName = document.getElementById("trackName");

thresholdInfo.textContent = MISTAKE_THRESHOLD;

// === WORD LOADING ===
function initializeWordsFromData(data) {
  WORD_SETS.short = Array.isArray(data.short) ? data.short : [];
  WORD_SETS.long = Array.isArray(data.long) ? data.long : [];

  ALL_WORDS = Array.from(new Set([...WORD_SETS.short, ...WORD_SETS.long]));
  if (ALL_WORDS.length === 0) {
    WORD_SETS.short = DEFAULT_WORDS.short;
    WORD_SETS.long = DEFAULT_WORDS.long;
    ALL_WORDS = Array.from(new Set([...WORD_SETS.short, ...WORD_SETS.long]));
  }
}

async function loadWords() {
  try {
    const response = await fetch("assets/json/word-list.json");
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    initializeWordsFromData(data);
    setFeedback("Words loaded from word list. Start typing!", "info");
  } catch (err) {
    console.warn("Using default words due to error:", err);
    initializeWordsFromData(DEFAULT_WORDS);
    setFeedback("Couldn't load external word list, using built-in words.", "info");
  }
  chooseNextWord();
}

function getRandomWordFromList(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function getActiveWordList() {
  if (difficulty === "short" && WORD_SETS.short.length) {
    return WORD_SETS.short;
  }
  if (difficulty === "long" && WORD_SETS.long.length) {
    return WORD_SETS.long;
  }
  return ALL_WORDS;
}

// === WORD & TYPING RENDERING ===
function renderCurrentWord() {
  if (!currentWord) {
    wordDisplay.textContent = "loading...";
    return;
  }

  const chars = currentWord.split("");
  const typed = typedChars.split("");

  const spans = chars
    .map((ch, idx) => {
      let cls = "letter pending";
      let text = ch;

      if (idx < typed.length) {
        if (typed[idx].toLowerCase() === ch.toLowerCase()) {
          cls = "letter correct";
        } else {
          cls = "letter incorrect";
        }
        text = typed[idx];
      }

      return `<span class="${cls}">${text}</span>`;
    })
    .join("");

  wordDisplay.innerHTML = spans;
}

function chooseNextWord() {
  if (!ALL_WORDS.length) {
    wordDisplay.textContent = "No words loaded";
    return;
  }

  if (mode === "game") {
    const list = getActiveWordList();
    currentWord = getRandomWordFromList(list);
  } else {
    const practiceWords = Array.from(practiceSet);
    if (practiceWords.length === 0) {
      const list = getActiveWordList();
      currentWord = getRandomWordFromList(list);
      setFeedback(
        "Practice list is empty. Showing a normal word instead.",
        "info"
      );
    } else {
      currentWord = getRandomWordFromList(practiceWords);
    }
  }

  typedChars = "";
  renderCurrentWord();
}

// === STATS & GAME LOGIC ===
function updateStats(isCorrect) {
  if (isCorrect) {
    correctCount++;
    streak++;
  } else {
    wrongCount++;
    streak = 0;
  }

  statCorrect.textContent = correctCount;
  statWrong.textContent = wrongCount;

  const total = correctCount + wrongCount;
  const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  statAccuracy.textContent = accuracy + "%";
  statStreak.textContent = streak;

  updateWpm();
}

function updateWpm() {
  if (!startTime) {
    statWpm.textContent = "0";
    return;
  }
  const now = performance.now();
  const elapsedMinutes = (now - startTime) / 60000;
  if (elapsedMinutes <= 0) {
    statWpm.textContent = "0";
    return;
  }
  const wpm = Math.round(correctCount / elapsedMinutes);
  statWpm.textContent = Number.isFinite(wpm) ? wpm : 0;
}

function updateTimeDisplay() {
  if (mode !== "game") {
    statTime.textContent = "--";
    return;
  }
  statTime.textContent = `${Math.ceil(remainingTime)}s`;
}

function updateScore(delta) {
  score = Math.max(0, score + delta);
  scoreDisplay.textContent = score;
}

function updateHearts() {
  heartsDisplay.textContent = "❤".repeat(lives);
}

function addMistakeForCurrentWord() {
  if (!currentWord) return;
  mistakeCounts[currentWord] = (mistakeCounts[currentWord] || 0) + 1;

  if (
    mistakeCounts[currentWord] >= MISTAKE_THRESHOLD &&
    !practiceSet.has(currentWord)
  ) {
    practiceSet.add(currentWord);
    updatePracticeListDisplay();
    setFeedback(`"${currentWord}" added to your practice list.`, "info");
  } else if (practiceSet.has(currentWord)) {
    updatePracticeListDisplay();
  }
}

function onCorrectWord() {
  updateStats(true);
  updateScore(10);
  setFeedback("Nice! Correct.", "success");
}

function onWrongWord() {
  updateStats(false);
  addMistakeForCurrentWord();
  updateScore(-5);
  lives = Math.max(0, lives - 1);
  updateHearts();
  setFeedback(`Oops! The correct word was "${currentWord}".`, "error");

  if (mode === "game" && lives === 0) {
    endGame();
  }
}

function finalizeWord() {
  if (!currentWord) return;
  const typed = typedChars;

  if (!startTime) {
    // Start timer for WPM on the first completed word
    startTime = performance.now();
  }

  if (typed.toLowerCase() === currentWord.toLowerCase()) {
    onCorrectWord();
  } else {
    onWrongWord();
  }

  typedChars = "";
  if (mode === "game" && gameState === "gameover") return;
  chooseNextWord();
}

function startGame() {
  mode = "game";
  gameState = "playing";
  remainingTime = GAME_DURATION_SECONDS;
  correctCount = 0;
  wrongCount = 0;
  streak = 0;
  score = 0;
  lives = STARTING_LIVES;
  startTime = null;

  statCorrect.textContent = "0";
  statWrong.textContent = "0";
  statAccuracy.textContent = "0%";
  statWpm.textContent = "0";
  statStreak.textContent = "0";
  updateScore(0);
  updateHearts();
  updateTimeDisplay();
  setFeedback("Game started! Type as many words as you can.", "info");

  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = setInterval(() => {
    if (mode !== "game" || gameState !== "playing") return;
    remainingTime -= 0.1;
    if (remainingTime <= 0) {
      remainingTime = 0;
      updateTimeDisplay();
      endGame();
      return;
    }
    updateTimeDisplay();
  }, 100);

  setMode("game", true); // update UI but don't re-run feedback
  chooseNextWord();
}

function endGame() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  gameState = "gameover";
  updateTimeDisplay();
  setFeedback(
    `Time up! Score: ${score}, Correct: ${correctCount}, Wrong: ${wrongCount}, WPM: ${statWpm.textContent}`,
    "info"
  );
  startGameButton.textContent = "Restart Game";
}

// === PRACTICE LIST UI ===
function updatePracticeListDisplay() {
  practiceWordsContainer.innerHTML = "";

  if (practiceSet.size === 0) {
    const empty = document.createElement("div");
    empty.className = "practice-empty";
    empty.textContent =
      "No practice words yet. Mistyped words will appear here.";
    practiceWordsContainer.appendChild(empty);
    return;
  }

  const container = document.createElement("div");
  container.className = "practice-words";

  practiceSet.forEach((word) => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
    const mistakes = mistakeCounts[word] || 0;
    chip.textContent = `${word} (${mistakes} miss)`;
    container.appendChild(chip);
  });

  practiceWordsContainer.appendChild(container);
}

// === MODE & DIFFICULTY ===
function setMode(newMode, skipFeedback = false) {
  if (mode === newMode && !skipFeedback) return;
  mode = newMode;

  modeButtons.forEach((btn) => {
    const btnMode = btn.getAttribute("data-mode");
    btn.classList.toggle("active", btnMode === mode);
  });

  if (mode === "game") {
    if (!skipFeedback) {
      setFeedback(
        "Game mode: 60 seconds to get as many words as you can.",
        "info"
      );
    }
    updateTimeDisplay();
  } else {
    setFeedback("Practice mode: no timer, just focus on accuracy.", "info");
    gameState = "ready";
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    statTime.textContent = "--";
  }

  chooseNextWord();
}

function setDifficulty(newDifficulty) {
  difficulty = newDifficulty;
  if (mode === "game") {
    setFeedback(`Difficulty set to "${difficulty}".`, "info");
  }
  chooseNextWord();
}

// === FEEDBACK ===
function setFeedback(message, type) {
  feedback.textContent = message;
  feedback.classList.remove("success", "error", "info");
  feedback.classList.add(type);
}

// === MUSIC ===
function updateTrackLabel() {
  if (!MUSIC_TRACKS.length) {
    trackName.textContent = "Track: Off";
    return;
  }
  const track = MUSIC_TRACKS[currentTrackIndex];
  trackName.textContent = "Track: " + track.name;
}

function loadCurrentTrack(autoplay = false) {
  if (!bgMusic || !MUSIC_TRACKS.length) return;
  const track = MUSIC_TRACKS[currentTrackIndex];
  bgMusic.src = track.file;
  updateTrackLabel();

  if (autoplay) {
    bgMusic.volume = 0.4;
    bgMusic
      .play()
      .then(() => {
        musicToggle.textContent = "Pause";
      })
      .catch((err) => console.error("Failed to play music:", err));
  }
}

function nextTrack() {
  if (!MUSIC_TRACKS.length) return;
  currentTrackIndex = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
  loadCurrentTrack(!bgMusic.paused);
}

function prevTrack() {
  if (!MUSIC_TRACKS.length) return;
  currentTrackIndex =
    (currentTrackIndex - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
  loadCurrentTrack(!bgMusic.paused);
}

function toggleMusic() {
  if (!bgMusic) return;

  if (!bgMusic.src) {
    loadCurrentTrack(true);
    return;
  }

  if (bgMusic.paused) {
    bgMusic
      .play()
      .then(() => {
        musicToggle.textContent = "Pause";
      })
      .catch((err) => console.error("Failed to play music:", err));
  } else {
    bgMusic.pause();
    musicToggle.textContent = "Play";
  }
}

// === KEYBOARD HANDLING (INLINE TYPING) ===
function handleKeyDown(event) {
  // Ignore modifier combos
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  // Only allow typing in game mode while playing, or always in practice
  if (mode === "game" && gameState !== "playing") return;
  if (!currentWord) return;

  if (event.key === "Backspace") {
    event.preventDefault();
    if (typedChars.length > 0) {
      typedChars = typedChars.slice(0, -1);
      renderCurrentWord();
    }
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (typedChars.length === currentWord.length) {
      finalizeWord();
    }
    return;
  }

  if (event.key.length === 1) {
    const ch = event.key.toLowerCase();
    if (!/[a-z]/.test(ch)) return; // letters only
    if (typedChars.length >= currentWord.length) return;

    typedChars += ch;
    renderCurrentWord();

    if (typedChars.length === currentWord.length) {
      finalizeWord();
    }
  }
}

// === INIT ===
function initGame() {
  updatePracticeListDisplay();
  updateTrackLabel();
  updateTimeDisplay();
  updateHearts();
  setFeedback("Loading words...", "info");
  loadWords();
}

// === EVENT LISTENERS ===
document.addEventListener("keydown", handleKeyDown);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const newMode = btn.getAttribute("data-mode");
    setMode(newMode);
  });
});

difficultySelect.addEventListener("change", (e) => {
  setDifficulty(e.target.value);
});

clearPracticeButton.addEventListener("click", () => {
  practiceSet.clear();
  updatePracticeListDisplay();
  setFeedback("Practice list cleared.", "info");
});

startGameButton.addEventListener("click", () => {
  startGameButton.textContent = "Restart Game";
  startGame();
});

nextTrackButton.addEventListener("click", nextTrack);
prevTrackButton.addEventListener("click", prevTrack);
musicToggle.addEventListener("click", toggleMusic);

// Kick off
initGame();
