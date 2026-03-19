/* ============================================
   SNAKE GAME
   ============================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const GRID = 20;                 // cell size in px
  const COLS = canvas.width / GRID;
  const ROWS = canvas.height / GRID;
  const INITIAL_SPEED = 130;       // ms per tick
  const SPEED_STEP = 2;            // ms faster per food eaten

  let snake, direction, nextDirection, food, score, speed;
  let running = false;
  let paused = false;
  let started = false;
  let loopId = null;

  const $score = document.getElementById('score');
  const $best = document.getElementById('best');
  const $finalScore = document.getElementById('finalScore');
  const $startOverlay = document.getElementById('startOverlay');
  const $gameOverOverlay = document.getElementById('gameOverOverlay');

  let bestScore = parseInt(localStorage.getItem('arcade-hs-snake')) || 0;
  $best.textContent = bestScore;

  /* ---------- Init ---------- */
  function init() {
    snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    score = 0;
    speed = INITIAL_SPEED;
    $score.textContent = score;
    placeFood();
    draw();
  }

  function placeFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  /* ---------- Game loop ---------- */
  function tick() {
    if (!running || paused) return;

    direction = { ...nextDirection };
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      $score.textContent = score;
      speed = Math.max(50, speed - SPEED_STEP);
      placeFood();
    } else {
      snake.pop();
    }

    draw();
    loopId = setTimeout(tick, speed);
  }

  /* ---------- Drawing ---------- */
  function draw() {
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (subtle)
    ctx.strokeStyle = '#151515';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#f00';
    ctx.shadowColor = '#f00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((seg, i) => {
      const brightness = 1 - (i / snake.length) * 0.5;
      ctx.fillStyle = `rgba(0,${Math.floor(255 * brightness)},0,1)`;
      ctx.shadowColor = '#0f0';
      ctx.shadowBlur = i === 0 ? 12 : 4;
      const pad = 1;
      ctx.fillRect(seg.x * GRID + pad, seg.y * GRID + pad, GRID - pad * 2, GRID - pad * 2);
    });
    ctx.shadowBlur = 0;

    // Eyes on head
    if (snake.length > 0) {
      const h = snake[0];
      ctx.fillStyle = '#000';
      const cx = h.x * GRID + GRID / 2;
      const cy = h.y * GRID + GRID / 2;
      const eyeOff = 4;
      if (direction.x !== 0) {
        ctx.fillRect(cx + direction.x * 3 - 1, cy - eyeOff - 1, 3, 3);
        ctx.fillRect(cx + direction.x * 3 - 1, cy + eyeOff - 1, 3, 3);
      } else {
        ctx.fillRect(cx - eyeOff - 1, cy + direction.y * 3 - 1, 3, 3);
        ctx.fillRect(cx + eyeOff - 1, cy + direction.y * 3 - 1, 3, 3);
      }
    }
  }

  /* ---------- Game over ---------- */
  function gameOver() {
    running = false;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('arcade-hs-snake', bestScore);
      $best.textContent = bestScore;
    }
    $finalScore.textContent = score;
    $gameOverOverlay.classList.remove('hidden');
  }

  /* ---------- Start / Restart ---------- */
  function startGame() {
    $startOverlay.classList.add('hidden');
    $gameOverOverlay.classList.add('hidden');
    init();
    running = true;
    paused = false;
    started = true;
    clearTimeout(loopId);
    tick();
  }

  /* ---------- Input ---------- */
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (!started && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      startGame();
    }

    if (e.code === 'Space' && running) {
      paused = !paused;
      if (!paused) tick();
      return;
    }

    switch (e.code) {
      case 'ArrowUp':    if (direction.y === 0) nextDirection = { x: 0, y: -1 }; break;
      case 'ArrowDown':  if (direction.y === 0) nextDirection = { x: 0, y: 1 }; break;
      case 'ArrowLeft':  if (direction.x === 0) nextDirection = { x: -1, y: 0 }; break;
      case 'ArrowRight': if (direction.x === 0) nextDirection = { x: 1, y: 0 }; break;
    }
  });

  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);

  /* ---------- Initial draw ---------- */
  init();
})();
