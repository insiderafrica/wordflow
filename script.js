// Game state variables
let secretWord = '';
let currentRow = 0;
let currentGuess = "";
const maxRows = 6;
let hasWonToday = false;
const today = new Date().toDateString();

// Statistics tracking
const stats = JSON.parse(localStorage.getItem("wordleStats")) || { 
  gamesPlayed: 0, 
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  points: 0,
  lastPlayedDate: null
};

// Settings
const settings = JSON.parse(localStorage.getItem("wordleSettings")) || {
  colorblind: false,
  difficulty: "medium" // easy, medium, hard
};

// Initialize game when DOM is loaded
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  
  loader.style.opacity = "0";
  
  loader.addEventListener("transitionend", () => {
    loader.remove();
    initGame();
  });

  setTimeout(() => {
    if (document.body.contains(loader)) {
      loader.remove();
    }
    initGame();
  }, 2000);
});

// Main game initialization
function initGame() {
  // Check if player has already won today
  const gameState = JSON.parse(localStorage.getItem("wordleGameState")) || {};
  hasWonToday = gameState.lastWinDate === today;
  
  // Reset streak if not played yesterday
  if (stats.lastPlayedDate && stats.lastPlayedDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastPlayedDate !== yesterday.toDateString()) {
      stats.currentStreak = 0;
      saveStats();
    }
  }
  
  if (hasWonToday) {
    showDailyCompleteBanner();
    disableGameInput();
    showPreviousAnswer();
  }

  // Select a random word based on daily seed and difficulty
  const dailySeed = Math.floor(Date.now() / 86400000);
  const filteredWords = filterWordsByDifficulty(WORDS, settings.difficulty);
  secretWord = filteredWords[dailySeed % filteredWords.length];
  
  if(settings.colorblind) document.body.classList.add("colorblind");
  
  initBoard();
  initKeyboard();
  initEventListeners();
  updateStatsDisplay();
  updatePointsDisplay();
}

// Filter words by difficulty
function filterWordsByDifficulty(words, difficulty) {
  // Simple difficulty ranking based on word characteristics
  return words.filter(word => {
    const uniqueLetters = new Set(word.split('')).size;
    const commonLetters = word.split('').filter(c => 
      ['a','e','i','o','u','r','s','t','l','n'].includes(c)).length;
    
    switch(difficulty) {
      case "easy":
        return uniqueLetters >= 4 && commonLetters >= 3;
      case "hard":
        return uniqueLetters <= 3 || commonLetters <= 2;
      default: // medium
        return true;
    }
  });
}

// New function to display yesterday's word
function showPreviousAnswer() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dailySeed = Math.floor(yesterday / 86400000);
  const filteredWords = filterWordsByDifficulty(WORDS, settings.difficulty);
  const yesterdaysWord = filteredWords[dailySeed % filteredWords.length];
  
  document.getElementById('yesterdays-word').textContent = 
    yesterdaysWord.toUpperCase();
    
  document.getElementById('mobile-yesterdays-word').textContent = 
    yesterdaysWord.toUpperCase();
}

// Create game board
function initBoard() {
  const board = document.getElementById("board");
  if (!board) return;
  
  board.innerHTML = '';
  
  for(let i = 0; i < maxRows * 5; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.id = `cell-${i}`;
    board.appendChild(cell);
  }
}

// Create on-screen keyboard
function initKeyboard() {
  const keyboard = document.getElementById("keyboard");
  if (!keyboard) return;
  
  keyboard.innerHTML = '';
  const layout = ["QWERTYUIOP", "ASDFGHJKL", "⌫ZXCVBNM↵"];

  layout.forEach(row => {
    const div = document.createElement("div");
    div.classList.add("keyboard-row");
    row.split("").forEach(key => {
      const btn = document.createElement("button");
      btn.classList.add("key");
      if(key === "⌫" || key === "↵") btn.classList.add("special");
      btn.textContent = key;
      btn.setAttribute("data-key", key === "⌫" ? "Backspace" : key === "↵" ? "Enter" : key);
      div.appendChild(btn);
    });
    keyboard.appendChild(div);
  });
}

// Set up event listeners
function initEventListeners() {
  // Only add event listeners if player hasn't won today
  if (!hasWonToday) {
    // Keyboard button clicks
    document.querySelectorAll(".key").forEach(btn => {
      btn.addEventListener("click", () => handleKeyPress(btn.textContent));
    });

    // Physical keyboard input
    document.addEventListener("keydown", handlePhysicalKeyboardInput);

    // Control buttons
    document.getElementById("hint-button").addEventListener("click", giveSmartHint);
    document.getElementById("reset-button").addEventListener("click", () => location.reload());
  }

  // These buttons should always work
  document.getElementById("colorblind-toggle").addEventListener("click", toggleColorblind);
  document.getElementById("reset-stats").addEventListener("click", resetStats);
  
  // Start game button
  document.getElementById("start-btn").addEventListener("click", function() {
    document.getElementById("start-screen").style.display = "none";
    initGame();
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !hasWonToday) {
      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault();
          showShortcutTooltip('colorblind-toggle');
          document.getElementById('colorblind-toggle').click();
          break;
        case 'h':
          e.preventDefault();
          document.getElementById('hint-button').click();
          break;
        case 'n':
          e.preventDefault();
          document.getElementById('reset-button').click();
          break;
        case 'r':
          e.preventDefault();
          document.getElementById('reset-stats').click();
          break;
      }
    }
  });

  // Mobile menu toggle
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.add('show');
  });
  
  document.getElementById('close-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.remove('show');
  });

  // Mobile button functionality
  document.getElementById('mobile-colorblind').addEventListener('click', toggleColorblind);
  document.getElementById('mobile-hint').addEventListener('click', giveSmartHint);
  document.getElementById('mobile-reset').addEventListener('click', () => location.reload());
  document.getElementById('mobile-reset-stats').addEventListener('click', resetStats);
  
  // Redeem buttons
  document.getElementById('redeem-tries').addEventListener('click', () => redeemPoints(10, 'tries'));
  document.getElementById('redeem-streak').addEventListener('click', () => redeemPoints(20, 'streak'));
  document.getElementById('mobile-redeem-tries').addEventListener('click', () => redeemPoints(10, 'tries'));
  document.getElementById('mobile-redeem-streak').addEventListener('click', () => redeemPoints(20, 'streak'));
  document.getElementById('redeem-tries-banner').addEventListener('click', () => redeemPoints(10, 'tries'));
  document.getElementById('redeem-streak-banner').addEventListener('click', () => redeemPoints(20, 'streak'));
  document.getElementById('decline-redeem').addEventListener('click', () => {
    document.getElementById('game-over-banner').classList.add('hidden');
  });
}

function showShortcutTooltip(buttonId) {
  const btn = document.getElementById(buttonId);
  const originalText = btn.textContent;
  btn.textContent = '✓ Activated!';
  setTimeout(() => {
    btn.textContent = originalText;
  }, 1000);
}

// Handle physical keyboard input
function handlePhysicalKeyboardInput(e) {
  if(e.ctrlKey || e.metaKey) return;
  
  const key = e.key.toUpperCase();
  if(key === "BACKSPACE") handleKeyPress("⌫");
  else if(key === "ENTER") handleKeyPress("↵");
  else if(/^[A-Z]$/.test(key)) handleKeyPress(key);
}

// Handle keyboard input
function handleKeyPress(key) {
  if(currentRow >= maxRows || hasWonToday) return;

  const normalizedKey = key.toLowerCase();
  
  // Prevent rapid key repeats
  if(this.lastKey === normalizedKey && this.lastKeyTime > Date.now() - 200) return;
  this.lastKey = normalizedKey;
  this.lastKeyTime = Date.now();

  switch(key) {
    case "⌫":
      currentGuess = currentGuess.slice(0, -1);
      break;
    case "↵":
      submitGuess();
      break;
    default:
      if(currentGuess.length < 5 && /^[a-zA-Z]$/.test(key)) {
        // Check if key is disabled (absent)
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (!keyElement || !keyElement.classList.contains('absent')) {
          currentGuess += normalizedKey;
        }
      }
  }
  updateBoard();
}

// Process submitted guess
function submitGuess() {
  if(currentGuess.length < 5) return showNotification("Not enough letters!");
  const normalizedGuess = currentGuess.toLowerCase().trim();
  
  if(!WORDS.includes(normalizedGuess)) {
    const similar = findSimilarWords(normalizedGuess);
    const message = `"${currentGuess}" not in word list.` + 
                   (similar.length ? ` Did you mean: ${similar.join(', ')}?` : '');
    return invalidGuess(message);
  }

  const guessArray = currentGuess.split("");
  const secretArray = secretWord.split("");
  const feedback = [];
  const remainingLetters = [];

  // Check for correct letters in correct positions
  guessArray.forEach((letter, i) => {
    if(letter === secretArray[i]) {
      feedback[i] = "correct";
    } else {
      remainingLetters.push(secretArray[i]);
    }
  });

  // Check for correct letters in wrong positions
  guessArray.forEach((letter, i) => {
    if(!feedback[i]) {
      if(remainingLetters.includes(letter)) {
        feedback[i] = "present";
        remainingLetters.splice(remainingLetters.indexOf(letter), 1);
      } else {
        feedback[i] = "absent";
      }
    }
    const cell = document.getElementById(`cell-${currentRow * 5 + i}`);
    if (cell) {
      cell.classList.add(feedback[i]);
    }
  });

  // Update keyboard with the guess and feedback
  updateKeyboard(guessArray, feedback);

  if(currentGuess === secretWord) {
    handleWin();
  } else if(++currentRow === maxRows) {
    handleLoss();
  }

  currentGuess = "";
}

// Update board display
function updateBoard() {
  for(let i = 0; i < 5; i++) {
    const cell = document.getElementById(`cell-${currentRow * 5 + i}`);
    if (cell) {
      cell.textContent = currentGuess[i] ? currentGuess[i].toUpperCase() : "";
    }
  }
}

// Update keyboard colors based on guesses
function updateKeyboard(guessArray, feedback) {
  guessArray.forEach((letter, i) => {
    const key = document.querySelector(`[data-key="${letter.toUpperCase()}"]`);
    if (key) {
      // Remove existing classes to prevent conflicts
      key.classList.remove("correct", "present", "absent");
      
      // Add the appropriate class based on feedback
      if (feedback[i] === "correct") {
        key.classList.add("correct");
      } else if (feedback[i] === "present") {
        // Only mark as present if not already correct
        if (!key.classList.contains("correct")) {
          key.classList.add("present");
        }
      } else if (feedback[i] === "absent") {
        key.classList.add("absent");
      }
    }
  });
}

// Handle winning the game
function handleWin() {
  // Confetti animation
  for(let i = 0; i < 150; i++) {
    setTimeout(() => {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, Math.random() * 1000);
  }
  
  setTimeout(() => {
    stats.gamesWon++;
    if(stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
    stats.lastPlayedDate = today;
    
    // Save win state
    const gameState = {
      lastWinDate: today,
      hasWon: true
    };
    localStorage.setItem("wordleGameState", JSON.stringify(gameState));
    
    showDailyCompleteBanner();
    disableGameInput();
    endGame();
  }, 500);
}

// Handle losing the game
function handleLoss() {
  // Show the correct letters on the board
  for (let i = 0; i < 5; i++) {
    const cell = document.getElementById(`cell-${currentRow * 5 + i}`);
    if (cell) {
      cell.textContent = secretWord[i].toUpperCase();
      cell.classList.add("correct");
    }
  }

  stats.currentStreak = 0;
  stats.lastPlayedDate = today;
  
  // Show redeem options if player has enough points
  document.getElementById('correct-word').textContent = secretWord.toUpperCase();
  document.getElementById('redeem-options').classList.remove('hidden');
  document.getElementById('redeem-tries-banner').disabled = stats.points < 10;
  document.getElementById('redeem-streak-banner').disabled = stats.points < 20;
  document.getElementById('game-over-banner').classList.remove('hidden');
  
  endGame();
}

// Show notification (onsite)
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 2000);
}

// Show invalid guess animation
function invalidGuess(message = "Not in word list") {
  currentGuess = "";
  updateBoard();
  const board = document.getElementById("board");
  if (board) {
    board.classList.add("shake");
    setTimeout(() => {
      board.classList.remove("shake");
      showNotification(message);
    }, 500);
  }
}

// Toggle colorblind mode
function toggleColorblind() {
  document.body.classList.toggle("colorblind");
  settings.colorblind = !settings.colorblind;
  saveSettings();
  const instructions = document.querySelector(".colorblind-instructions");
  if (instructions) instructions.hidden = !settings.colorblind;
}

// Provide a hint to the player
function giveSmartHint() {
  const unusedLetters = secretWord.split("").filter(l => !currentGuess.includes(l));
  const hint = unusedLetters[Math.floor(Math.random() * unusedLetters.length)] || secretWord[0];
  
  // Show the hint popup
  const hintContainer = document.getElementById("hint-container");
  const hintLetter = document.getElementById("hint-letter");
  
  hintLetter.textContent = hint.toUpperCase();
  hintContainer.classList.remove("hidden");
  
  // Close button functionality
  document.getElementById("close-hint").addEventListener("click", () => {
    hintContainer.classList.add("hidden");
  });
  
  // Also close when clicking outside
  hintContainer.addEventListener("click", (e) => {
    if (e.target === hintContainer) {
      hintContainer.classList.add("hidden");
    }
  });
}

// Show daily completion banner
function showDailyCompleteBanner() {
  const banner = document.getElementById("daily-complete-banner");
  banner.classList.remove("hidden");
}

// Disable game input after winning
function disableGameInput() {
  // Disable keyboard buttons
  document.querySelectorAll(".key").forEach(btn => {
    btn.disabled = true;
  });
  
  // Disable control buttons except colorblind toggle
  document.querySelectorAll("#controls button:not(#colorblind-toggle)").forEach(btn => {
    btn.disabled = true;
  });
}

// End game and update stats
function endGame() {
  stats.gamesPlayed++;
  stats.currentStreak = currentGuess === secretWord ? stats.currentStreak + 1 : 0;
  saveStats();
  updateStatsDisplay();
  updatePointsDisplay();
}

// Reset all statistics
function resetStats() {
  if (confirm("Are you sure you want to reset all your game statistics?")) {
    stats.gamesPlayed = 0;
    stats.gamesWon = 0;
    stats.currentStreak = 0;
    stats.maxStreak = 0;
    stats.points = 0;
    saveStats();
    updateStatsDisplay();
    updatePointsDisplay();
    showNotification("Statistics have been reset!");
  }
}

// Update stats display
function updateStatsDisplay() {
  const elements = {
    "games-played": stats.gamesPlayed,
    "games-won": stats.gamesWon,
    "current-streak": stats.currentStreak,
    "max-streak": stats.maxStreak,
    "mobile-games-played": stats.gamesPlayed,
    "mobile-games-won": stats.gamesWon,
    "mobile-streak": stats.currentStreak,
    "mobile-max-streak": stats.maxStreak
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

// Update points display
function updatePointsDisplay() {
  document.getElementById('user-points').textContent = stats.points;
  document.getElementById('mobile-user-points').textContent = stats.points;
  
  // Update redeem button states
  document.getElementById('redeem-tries').disabled = stats.points < 10;
  document.getElementById('redeem-streak').disabled = stats.points < 20;
  document.getElementById('mobile-redeem-tries').disabled = stats.points < 10;
  document.getElementById('mobile-redeem-streak').disabled = stats.points < 20;
}

// Redeem points for benefits
function redeemPoints(cost, type) {
  if (stats.points < cost) {
    showNotification(`Not enough points! You need ${cost} points.`);
    document.getElementById('redeem-options').classList.add('hidden');
    document.getElementById('game-over-banner').classList.add('hidden');
    return false;
  }

  if (confirm(`Are you sure you want to spend ${cost} points to ${type === 'tries' ? 'get extra tries?' : 'save your streak?'}`)) {
    stats.points -= cost;
    
    if (type === 'tries') {
      currentRow = 0; // Reset current row for extra tries
      showNotification("You've been granted extra tries!");
      // Reset the board for new tries
      resetBoardForExtraTries();
    } else {
      stats.currentStreak++; // Save streak
      showNotification("Your streak has been saved!");
    }
    
    document.getElementById('game-over-banner').classList.add('hidden');
    saveStats();
    updatePointsDisplay();
    updateStatsDisplay();
    return true;
  }
  return false;
}

// Add new function to reset board for extra tries
function resetBoardForExtraTries() {
  // Clear current guess
  currentGuess = "";
  
  // Reset the current row to 0
  currentRow = 0;
  
  // Clear any existing game over banners
  document.getElementById('game-over-banner').classList.add('hidden');
  document.getElementById('redeem-options').classList.add('hidden');
  
  // Enable input
  document.querySelectorAll(".key").forEach(btn => {
    btn.disabled = false;
  });
}

// Save stats to localStorage
function saveStats() {
  localStorage.setItem("wordleStats", JSON.stringify(stats));
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem("wordleSettings", JSON.stringify(settings));
}

// Helper function to find similar words for hints
function findSimilarWords(guess) {
  return WORDS.filter(word => {
    return word[0] === guess[0] || 
           word[4] === guess[4] ||
           word.split('').filter((c, i) => c === guess[i]).length >= 4;
  }).slice(0, 3);
}