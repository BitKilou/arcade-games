/* ============================================
   BREAKOUT GAME
   ============================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  /* ---------- Config ---------- */
  const PADDLE_W = 80;
  const PADDLE_H = 12;
  const PADDLE_SPEED = 7;
  const BALL_R = 5;
  const INITIAL_BALL_SPEED = 4;
  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_W = (W - 20) / BRICK_COLS;
  const BRICK_H = 18;
  const BRICK_PAD = 2;
  const BRICK_TOP = 50;
  const BRICK_LEFT = 10;
  const MAX_LEVEL = 5;

  const ROW_COLORS = ['#f00', '#f60', '#ff0', '#0f0', '#0af', '#a0f'];

  /* ---------- State ---------- */
  let paddle, ball, bricks, score, lives, level;
  let running = false;
  let started = false;
  let ballAttached = true;
  let keys = {};
  let rafId = null;

  const $score = document.getElementById('score');
  const $lives = document.getElementById('lives');
  const $level = document.getElementById('level');
  const $best = document.getElementById('best');
  const $finalScore = document.getElementById('finalScore');
  const $winScore = document.getElementById('winScore');
  const $startOverlay = document.getElementById('startOverlay');
  const $gameOverOverlay = document.getElementById('gameOverOverlay');
  const $winOverlay = document.getElementById('winOverlay');

  let bestScore = parseInt(localStorage.getItem('arcade-hs-breakout')) || 0;
  $best.textContent = bestScore;

  /* ---------- Init ---------- */
  function init(resetScore) {
    paddle = { x: W / 2 - PADDLE_W / 2, y: H - 30, w: PADDLE_W, h: PADDLE_H };
    ball = { x: 0, y: 0, dx: 0, dy: 0, r: BALL_R };
    attachBall();

    if (resetScore) {
      score = 0;
      lives = 3;
      level = 1;
    }
    buildBricks();
    updateUI();
    draw();
  }

  function attachBall() {
    ballAttached = true;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 1;
    ball.dx = 0;
    ball.dy = 0;
  }

  function launchBall() {
    if (!ballAttached) return;
    ballAttached = false;
    const speedMult = 1 + (level - 1) * 0.15;
    const speed = INITIAL_BALL_SPEED * speedMult;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    ball.dx = Math.cos(angle) * speed;
    ball.dy = Math.sin(angle) * speed;
  }

  function buildBricks() {
    bricks = [];
    const rows = Math.min(BRICK_ROWS, 3 + level);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        // Higher levels add multi-hit bricks
        let hp = 1;
        if (level >= 3 && r < 2) hp = 2;
        if (level >= 5 && r === 0) hp = 3;
        bricks.push({
          x: BRICK_LEFT + c * BRICK_W,
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: BRICK_W - BRICK_PAD,
          h: BRICK_H,
          color: ROW_COLORS[r % ROW_COLORS.length],
          hp,
          maxHp: hp,
          alive: true
        });
      }
    }
  }

  function updateUI() {
    $score.textContent = score;
    $lives.textContent = lives;
    $level.textContent = level;
  }

  /* ---------- Drawing ---------- */
  function draw() {
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      const alpha = 0.4 + 0.6 * (b.hp / b.maxHp);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(b.x, b.y, b.w, 3);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // HP indicator for multi-hit bricks
      if (b.maxHp > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(b.hp, b.x + b.w / 2, b.y + b.h / 2 + 3);
      }
    });

    // Paddle
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = '#f80';
    ctx.shadowColor = '#f80';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lives indicators
    for (let i = 0; i < lives; i++) {
      ctx.fillStyle = '#f80';
      ctx.beginPath();
      ctx.arc(20 + i * 18, H - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- Game loop ---------- */
  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    // Paddle movement
    if (keys['ArrowLeft'] || keys['KeyA']) paddle.x -= PADDLE_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) paddle.x += PADDLE_SPEED;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    if (ballAttached) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 1;
      draw();
      return;
    }

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if (ball.x - ball.r <= 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); }
    if (ball.x + ball.r >= W) { ball.x = W - ball.r; ball.dx = -Math.abs(ball.dx); }
    if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); }

    // Bottom — lose life
    if (ball.y + ball.r >= H) {
      lives--;
      updateUI();
      if (lives <= 0) return gameOver();
      attachBall();
      draw();
      return;
    }

    // Paddle collision
    if (
      ball.dy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h + 4 &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      // Angle based on hit position
      const hit = (ball.x - paddle.x) / paddle.w; // 0..1
      const angle = (hit - 0.5) * Math.PI * 0.7; // -63° to +63°
      const speedMult = 1 + (level - 1) * 0.15;
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      const newSpeed = Math.max(speed, INITIAL_BALL_SPEED * speedMult);
      ball.dx = Math.sin(angle) * newSpeed;
      ball.dy = -Math.cos(angle) * newSpeed;
      ball.y = paddle.y - ball.r - 1;
    }

    // Brick collisions
    let hit = false;
    bricks.forEach(b => {
      if (!b.alive) return;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        if (!hit) {
          // Determine collision side
          const overlapLeft = (ball.x + ball.r) - b.x;
          const overlapRight = (b.x + b.w) - (ball.x - ball.r);
          const overlapTop = (ball.y + ball.r) - b.y;
          const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }
          hit = true;
        }

        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          score += 10 * level;
        } else {
          score += 5;
        }
        updateUI();
      }
    });

    // Check level complete
    if (bricks.every(b => !b.alive)) {
      if (level >= MAX_LEVEL) return win();
      level++;
      buildBricks();
      attachBall();
      updateUI();
    }

    draw();
  }

  /* ---------- Game over / Win ---------- */
  function gameOver() {
    running = false;
    cancelAnimationFrame(rafId);
    saveBest();
    $finalScore.textContent = score;
    $gameOverOverlay.classList.remove('hidden');
  }

  function win() {
    running = false;
    cancelAnimationFrame(rafId);
    saveBest();
    $winScore.textContent = score;
    $winOverlay.classList.remove('hidden');
  }

  function saveBest() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('arcade-hs-breakout', bestScore);
      $best.textContent = bestScore;
    }
  }

  /* ---------- Start ---------- */
  function startGame() {
    $startOverlay.classList.add('hidden');
    $gameOverOverlay.classList.add('hidden');
    $winOverlay.classList.add('hidden');
    init(true);
    running = true;
    started = true;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- Input ---------- */
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();

    if (!started && e.code === 'Space') { startGame(); return; }
    if (e.code === 'Space' && running && ballAttached) launchBall();
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('winPlayAgainBtn').addEventListener('click', startGame);

  /* ---------- Initial draw ---------- */
  init(true);
})();
