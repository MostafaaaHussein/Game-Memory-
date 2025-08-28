// Configuration
const TOTAL_MINUTES = 5; // 5-minute countdown
const EMOJIS = [
    '🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍',
    '🍋', '🍉', '🥥', '🍐', '🫐', '🥭', '🥕', '🌽',
    '🍔', '🍟', '🍕', '🌭', '🍗', '🍣', '🍙', '🍤'
];

// DOM references
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const starsLiveEl = document.getElementById('stars');
const timerEl = document.getElementById('timer');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

// Modal refs
const modalEl = document.getElementById('modal');
const modalTitleEl = document.getElementById('modalTitle');
const resultTextEl = document.getElementById('resultText');
const resultStarsEl = document.getElementById('resultStars');
const resultMovesEl = document.getElementById('resultMoves');
const resultMatchesEl = document.getElementById('resultMatches');
const resultTimeEl = document.getElementById('resultTime');
const closeModalBtn = document.getElementById('closeModalBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

// Game state
let deck = []; // array of emojis (pairs)
let firstFlipped = null;
let secondFlipped = null;
let isBusy = false;
let movesCount = 0; // number of user clicks grouped by 2 as "1 move"
let pairsFound = 0;
let totalPairs = 0;
let timerInterval = null;
let remainingSeconds = TOTAL_MINUTES * 60;
let gameStarted = false;

// Utility
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function calculateStars(movesUsed, minimalMoves) {
    // minimalMoves: number of moves when completed with zero mistakes (pairsFound === totalPairs and 2 clicks per pair)
    // Rule:
    // 5 stars if moves == minimalMoves
    // 4 stars if moves <= minimalMoves + 2
    // 3 stars if moves <= minimalMoves + 4
    // 2 stars if moves <= minimalMoves + 6
    // 1 star otherwise
    if (movesUsed <= minimalMoves) return 5;
    if (movesUsed <= minimalMoves + 2) return 4;
    if (movesUsed <= minimalMoves + 4) return 3;
    if (movesUsed <= minimalMoves + 6) return 2;
    return 1;
}

function starsToString(starCount) {
    return '★★★★★'.slice(0, starCount) + '☆☆☆☆☆'.slice(0, 5 - starCount);
}

function updateLiveStats() {
    movesEl.textContent = String(movesCount);
    const minimalMoves = totalPairs; // each move matches 2 clicks (1 pair) in ideal scenario
    const stars = calculateStars(movesCount, minimalMoves);
    starsLiveEl.textContent = starsToString(stars);
}

function createCard(emoji, index) {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    card.setAttribute('data-idx', String(index));
    card.setAttribute('aria-label', 'Hidden card');

    const inner = document.createElement('div');
    inner.className = 'card__inner';

    const front = document.createElement('div');
    front.className = 'card__face card__face--front';

    const back = document.createElement('div');
    back.className = 'card__face card__face--back';
    const span = document.createElement('span');
    span.className = 'card__emoji';
    span.textContent = emoji;
    back.appendChild(span);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener('click', () => onCardClicked(card, emoji));
    return card;
}

function buildBoard(pairCount = 12) {
    // Ensure we have enough emojis
    const pool = EMOJIS.slice(0, Math.max(pairCount, 2));
    const unique = shuffle(pool.slice(0, pairCount));
    deck = shuffle(unique.concat(unique));
    totalPairs = pairCount;

    boardEl.innerHTML = '';
    deck.forEach((emoji, idx) => boardEl.appendChild(createCard(emoji, idx)));
}

function resetState() {
    firstFlipped = null;
    secondFlipped = null;
    isBusy = false;
    movesCount = 0;
    pairsFound = 0;
    gameStarted = false;
    remainingSeconds = TOTAL_MINUTES * 60;
    timerEl.textContent = formatTime(remainingSeconds);
    updateLiveStats();
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            timerEl.textContent = formatTime(remainingSeconds);
            clearInterval(timerInterval);
            endGame('Time up');
            return;
        }
        timerEl.textContent = formatTime(remainingSeconds);
    }, 1000);
}

function onCardClicked(cardEl, emoji) {
    if (isBusy) return;
    if (cardEl.classList.contains('is-flipped') || cardEl.classList.contains('is-matched')) return;

    // Start timer on first interaction
    if (!gameStarted) {
        gameStarted = true;
        startTimer();
    }

    cardEl.classList.add('is-flipped');

    if (!firstFlipped) {
        firstFlipped = { cardEl, emoji };
        return;
    }

    secondFlipped = { cardEl, emoji };
    isBusy = true;

    // Count a move each time a pair is attempted (2 clicks)
    movesCount += 1;
    updateLiveStats();

    const isMatch = firstFlipped.emoji === secondFlipped.emoji;
    if (isMatch) {
        setTimeout(() => {
            firstFlipped.cardEl.classList.add('is-matched');
            secondFlipped.cardEl.classList.add('is-matched');
            pairsFound += 1;
            clearFlipSelection();
            if (pairsFound === totalPairs) {
                endGame('Completed');
            }
        }, 350);
    } else {
        setTimeout(() => {
            firstFlipped.cardEl.classList.remove('is-flipped');
            secondFlipped.cardEl.classList.remove('is-flipped');
            clearFlipSelection();
        }, 700);
    }
}

function clearFlipSelection() {
    firstFlipped = null;
    secondFlipped = null;
    isBusy = false;
}

function endGame(resultReason) {
    clearInterval(timerInterval);
    timerInterval = null;

    const minimalMoves = totalPairs; // ideal: 1 move per pair
    const stars = calculateStars(movesCount, minimalMoves);

    resultTextEl.textContent = resultReason;
    resultStarsEl.textContent = starsToString(stars);
    resultMovesEl.textContent = String(movesCount);
    resultMatchesEl.textContent = `${pairsFound}/${totalPairs}`;
    resultTimeEl.textContent = formatTime(TOTAL_MINUTES * 60 - remainingSeconds);

    modalEl.setAttribute('aria-hidden', 'false');
}

function hideModal() {
    modalEl.setAttribute('aria-hidden', 'true');
}

function submitScore() {
    // End the game immediately and show current score
    const status = pairsFound === totalPairs ? 'Completed' : 'Submitted';
    endGame(status);
}

function resetGame() {
    hideModal();
    clearInterval(timerInterval);
    timerInterval = null;
    resetState();
    buildBoard(12); // 12 pairs = 24 cards default
}

// Event listeners
submitBtn.addEventListener('click', submitScore);
resetBtn.addEventListener('click', resetGame);
closeModalBtn.addEventListener('click', hideModal);
playAgainBtn.addEventListener('click', resetGame);

// Init
resetState();
buildBoard(12);


