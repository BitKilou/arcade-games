/* ============================================
   TETRIS GAME
   ============================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');

  const COLS = 10;
  const ROWS = 20;
  const CELL = canvas.width / COLS; // 25
  const NEXT_CELL = 20;

  const COLORS = ['#0ff', '#ff0', '#a0f', '#0f0', '#f00', '#00f', '#f80'];

  // Tetromino shapes (each rotation state)
  const SHAPES = [
    [[1,1,1,1]],                         // I
    [[1,1],[1,1]],                        // O
    [[0,1,0],[1,1,1]],                    // T
    [[1,0,0],[1,1,1]],                    // L
    [[0,0,1],[1,1,1]],                    // J
    [[0,1,1],[1,1,0]],                    // S
    [[1,1,0],[0,1,1]]                     // Z
  ];

  let board, current, next, score, lines, level, speed;
  let running = false;
  let paused = false;
  let started = false;
  let dropTime = 0;
  let lastTime = 0;
  let rafId = null;

  const $score = document.getElementById('score');
  const $lines = document.getElementById('lines');
  const $level = document.getElementById('level');
  const $best = document.getElementById('best');
  const $finalScore = document.getElementById('finalScore');
  const $startOverlay = document.getElementById('startOverlay');
  const $gameOverOverlay = document.getElementById('gameOverOverlay');

  let bestScore = parseInt(localStorage.getItem('arcade-hs-tetris')) || 0;
  $best.textContent = bestScore;

  /* ---------- Piece helpers ---------- */
  function createPiece(shapeIdx) {
    const shape = SHAPES[shapeIdx].map(r => [...r]);
    return {
      shape,
      color: COLORS[shapeIdx],
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0
    };
  }

  function randomPiece() {
    return createPiece(Math.floor(Math.random() * SHAPES.length));
  }

  function rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    for (let c = 0; c < cols; c++) {
      rotated[c] = [];
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c].push(shape[r][c]);
      }
    }
    return rotated;
  }

  function collides(shape, offX, offY) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = offX + c;
        const ny = offY + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function lock() {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        const y = current.y + r;
        const x = current.x + c;
        if (y < 0) return gameOver();
        board[y][x] = current.color;
      }
    }
    clearLines();
    current = next;
    next = randomPiece();
    drawNext();
    if (collides(current.shape, current.x, current.y)) gameOver();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(c => c)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++; // recheck row
      }
    }
    if (cleared) {
      const pts = [0, 100, 300, 500, 800];
      score += (pts[cleared] || 800) * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      speed = Math.max(80, 800 - (level - 1) * 60);
      updateUI();
    }
  }

  function updateUI() {
    $score.textContent = score;
    $lines.textContent = lines;
    $level.textContent = level;
  }

  /* ---------- Drawing ---------- */
  function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#151515';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += CELL) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += CELL) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Board
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          drawCell(ctx, c, r, board[r][c], CELL);
        }
      }
    }

    // Ghost piece
    if (current) {
      let ghostY = current.y;
      while (!collides(current.shape, current.x, ghostY + 1)) ghostY++;
      if (ghostY !== current.y) {
        ctx.globalAlpha = 0.2;
        for (let r = 0; r < current.shape.length; r++) {
          for (let c = 0; c < current.shape[r].length; c++) {
            if (current.shape[r][c]) {
              drawCell(ctx, current.x + c, ghostY + r, current.color, CELL);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Current piece
      for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
          if (current.shape[r][c]) {
            drawCell(ctx, current.x + c, current.y + r, current.color, CELL);
          }
        }
      }
    }
  }

  function drawCell(context, x, y, color, size) {
    const px = x * size;
    const py = y * size;
    context.fillStyle = color;
    context.fillRect(px + 1, py + 1, size - 2, size - 2);
    // Highlight
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px + 1, py + 1, size - 2, 3);
    context.fillRect(px + 1, py + 1, 3, size - 2);
    // Shadow
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(px + size - 3, py + 1, 2, size - 2);
    context.fillRect(px + 1, py + size - 3, size - 2, 2);
  }

  function drawNext() {
    nextCtx.fillStyle = '#0a0a0a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!next) return;
    const offX = Math.floor((5 - next.shape[0].length) / 2);
    const offY = Math.floor((5 - next.shape.length) / 2);
    for (let r = 0; r < next.shape.length; r++) {
      for (let c = 0; c < next.shape[r].length; c++) {
        if (next.shape[r][c]) {
          drawCell(nextCtx, offX + c, offY + r, next.color, NEXT_CELL);
        }
      }
    }
  }

  /* ---------- Game loop ---------- */
  function loop(time) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (paused) return;

    const delta = time - lastTime;
    lastTime = time;
    dropTime += delta;

    if (dropTime > speed) {
      dropTime = 0;
      if (!collides(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lock();
      }
    }

    draw();
  }

  /* ---------- Game over ---------- */
  function gameOver() {
    running = false;
    cancelAnimationFrame(rafId);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('arcade-hs-tetris', bestScore);
      $best.textContent = bestScore;
    }
    $finalScore.textContent = score;
    $gameOverOverlay.classList.remove('hidden');
  }

  /* ---------- Start ---------- */
  function startGame() {
    $startOverlay.classList.add('hidden');
    $gameOverOverlay.classList.add('hidden');
    board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    score = 0; lines = 0; level = 1;
    speed = 800; dropTime = 0; lastTime = performance.now();
    updateUI();
    current = randomPiece();
    next = randomPiece();
    drawNext();
    running = true;
    paused = false;
    started = true;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- Input ---------- */
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();

    if (!started) { startGame(); return; }

    if (e.code === 'KeyP' && running) {
      paused = !paused;
      if (!paused) lastTime = performance.now();
      return;
    }

    if (!running || paused) return;

    switch (e.code) {
      case 'ArrowLeft':
        if (!collides(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case 'ArrowRight':
        if (!collides(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case 'ArrowDown':
        if (!collides(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
          updateUI();
        }
        break;
      case 'ArrowUp': {
        const rotated = rotate(current.shape);
        // Wall kick: try 0, -1, +1, -2, +2
        for (const kick of [0, -1, 1, -2, 2]) {
          if (!collides(rotated, current.x + kick, current.y)) {
            current.shape = rotated;
            current.x += kick;
            break;
          }
        }
        break;
      }
      case 'Space': {
        let dropped = 0;
        while (!collides(current.shape, current.x, current.y + 1)) {
          current.y++;
          dropped++;
        }
        score += dropped * 2;
        updateUI();
        lock();
        dropTime = 0;
        break;
      }
    }
  });

  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);

  /* ---------- Initial draw ---------- */
  draw();
  drawNext();
})();
