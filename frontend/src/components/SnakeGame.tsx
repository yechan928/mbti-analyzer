import { useEffect, useRef, useState } from "react";

const CELL = 16;
const SPEED_INIT = 120;
const HS_KEY = "joseonSnakeHighScore";
const SCALE = 0.55; // getScaled factor (원본 0.67에서 소형 캔버스에 맞게 축소)

type Dir = { x: number; y: number };
type Pt = { x: number; y: number };

function gs(value: number) {
  return Math.max(1, Math.floor(value * SCALE));
}

function randomFood(cols: number, rows: number, snake: Pt[]): Pt {
  let pt: Pt;
  do {
    pt = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  } while (snake.some((s) => s.x === pt.x && s.y === pt.y));
  return pt;
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: Pt[], cs: number) {
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    const x = seg.x * cs;
    const y = seg.y * cs;

    if (i === 0) {
      // 머리: 붉은 + 금빛 왕관 + 눈
      ctx.fillStyle = "#9c1c1c";
      ctx.fillRect(x, y, cs, cs);

      ctx.fillStyle = "#d4af37";
      ctx.fillRect(x + gs(cs * 0.05), y + gs(cs * 0.08), cs - gs(cs * 0.1), gs(cs * 0.15));

      ctx.fillStyle = "#ffbf00";
      const eyeSize = Math.max(2, gs(cs * 0.12));
      ctx.fillRect(x + gs(cs * 0.12), y + gs(cs * 0.08), eyeSize, eyeSize);
      ctx.fillRect(x + cs - gs(cs * 0.24), y + gs(cs * 0.08), eyeSize, eyeSize);

      ctx.fillRect(x + gs(cs * 0.35), y + gs(cs * 0.28), gs(cs * 0.3), gs(cs * 0.1));
    } else {
      // 몸통: 교대 색 + 초록 인셋 + 금 대각선
      const isEven = i % 2 === 0;
      ctx.fillStyle = isEven ? "#9c1c1c" : "#7a1629";
      ctx.fillRect(x, y, cs, cs);

      ctx.fillStyle = "rgba(52, 140, 110, 0.7)";
      const inset = gs(cs * 0.1);
      ctx.fillRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2);

      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = Math.max(1, gs(cs * 0.05));
      ctx.beginPath();
      if (isEven) {
        ctx.moveTo(x + inset, y + cs - inset);
        ctx.lineTo(x + cs - inset, y + inset);
      } else {
        ctx.moveTo(x + inset, y + inset);
        ctx.lineTo(x + cs - inset, y + cs - inset);
      }
      ctx.stroke();
    }
  }
}

function drawFood(ctx: CanvasRenderingContext2D, food: Pt, cs: number, ts: number) {
  const fx = food.x * cs + cs / 2;
  const fy = food.y * cs + cs / 2;
  const baseSize = gs(cs * 0.82);
  const pulse = Math.sin(ts / 200) * 0.08 + 1.0;
  const radius = (baseSize * pulse) / 2;

  ctx.shadowColor = "#c8102e";
  ctx.shadowBlur = gs(baseSize * 0.15);
  ctx.fillStyle = "#c8102e";
  ctx.beginPath();
  ctx.arc(fx, fy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = gs(baseSize * 0.08);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = gs(radius * 0.22);
  ctx.beginPath();
  ctx.arc(fx, fy, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = gs(baseSize * 0.04);
  ctx.lineWidth = Math.max(1, gs(radius * 0.08));
  ctx.beginPath();
  ctx.arc(fx, fy, radius * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, gs(radius * 0.06));
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const ix = fx + Math.cos(ang) * (radius * 0.32);
    const iy = fy + Math.sin(ang) * (radius * 0.32);
    ctx.beginPath();
    ctx.moveTo(ix - gs(radius * 0.12), iy);
    ctx.lineTo(ix + gs(radius * 0.12), iy);
    ctx.moveTo(ix, iy - gs(radius * 0.12));
    ctx.lineTo(ix, iy + gs(radius * 0.12));
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 5, y: 5 }] as Pt[],
    dir: { x: 1, y: 0 } as Dir,
    nextDir: { x: 1, y: 0 } as Dir,
    food: { x: 10, y: 5 } as Pt,
    score: 0,
    highScore: parseInt(localStorage.getItem(HS_KEY) ?? "0", 10),
    speed: SPEED_INIT,
    lastTick: 0,
    phase: "idle" as "idle" | "running" | "over",
    cols: 0,
    rows: 0,
  });
  const rafRef = useRef<number>(0);
  const [display, setDisplay] = useState({
    score: 0,
    highScore: parseInt(localStorage.getItem(HS_KEY) ?? "0", 10),
    phase: "idle" as "idle" | "running" | "over",
  });

  function syncDisplay() {
    const s = stateRef.current;
    setDisplay({ score: s.score, highScore: s.highScore, phase: s.phase });
  }

  function startGame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cols = Math.floor(canvas.width / CELL);
    const rows = Math.floor(canvas.height / CELL);
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    const s = stateRef.current;
    s.cols = cols;
    s.rows = rows;
    s.snake = snake;
    s.dir = { x: 1, y: 0 };
    s.nextDir = { x: 1, y: 0 };
    s.food = randomFood(cols, rows, snake);
    s.score = 0;
    s.speed = SPEED_INIT;
    s.lastTick = 0;
    s.phase = "running";
    syncDisplay();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    // 격자 경계에 딱 맞게 정수 배수로 맞춤
    const cols = Math.floor(parent.clientWidth / CELL) - 2;
    const rows = Math.floor(parent.clientHeight / CELL) - 2;
    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
    const s = stateRef.current;
    s.cols = cols;
    s.rows = rows;
    s.food = randomFood(s.cols, s.rows, s.snake);

    function draw(ts: number) {
      const ctx = canvas!.getContext("2d")!;
      const g = stateRef.current;
      const cw = canvas!.width;
      const ch = canvas!.height;

      // tick
      if (g.phase === "running" && ts - g.lastTick > g.speed) {
        g.lastTick = ts;
        g.dir = { ...g.nextDir };
        const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };

        if (head.x < 0 || head.x >= g.cols || head.y < 0 || head.y >= g.rows) {
          g.phase = "over";
          if (g.score > g.highScore) {
            g.highScore = g.score;
            localStorage.setItem(HS_KEY, String(g.highScore));
          }
          syncDisplay();
        } else if (g.snake.some((p) => p.x === head.x && p.y === head.y)) {
          g.phase = "over";
          if (g.score > g.highScore) {
            g.highScore = g.score;
            localStorage.setItem(HS_KEY, String(g.highScore));
          }
          syncDisplay();
        } else {
          g.snake.unshift(head);
          if (head.x === g.food.x && head.y === g.food.y) {
            g.score += 10;
            g.speed = Math.max(50, SPEED_INIT - Math.floor(g.score / 30) * 8);
            g.food = randomFood(g.cols, g.rows, g.snake);
            syncDisplay();
          } else {
            g.snake.pop();
          }
        }
      }

      // 배경
      ctx.fillStyle = "#1a1423";
      ctx.fillRect(0, 0, cw, ch);

      // 물결 배경선 (금빛, 애니메이션)
      ctx.strokeStyle = "rgba(212, 175, 55, 0.06)";
      ctx.lineWidth = gs(CELL * 0.05);
      for (let i = 0; i < 4; i++) {
        const y = ((ts / 12000) % ch) + i * (ch / 3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(cw * 0.25, y - gs(CELL * 0.6), cw * 0.55, y + gs(CELL * 0.4));
        ctx.quadraticCurveTo(cw * 0.8, y - gs(CELL * 0.7), cw, y + gs(CELL * 0.3));
        ctx.stroke();
      }

      // 격자
      ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
      ctx.lineWidth = gs(CELL * 0.025);
      for (let x = 0; x <= g.cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, ch);
        ctx.stroke();
      }
      for (let y = 0; y <= g.rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(cw, y * CELL);
        ctx.stroke();
      }

      // 테두리
      ctx.strokeStyle = "rgba(58, 32, 10, 0.9)";
      ctx.lineWidth = gs(CELL * 0.2);
      ctx.strokeRect(1, 1, cw - 2, ch - 2);

      drawFood(ctx, g.food, CELL, ts);
      drawSnake(ctx, g.snake, CELL);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const g = stateRef.current;
      if (g.phase === "idle" || g.phase === "over") {
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"," ","Enter"].includes(e.key)) {
          startGame();
          return;
        }
      }
      const map: Record<string, Dir> = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      const cur = g.dir;
      if (nd.x === -cur.x && nd.y === -cur.y) return;
      g.nextDir = nd;
    }

    let tx = 0, ty = 0;
    function onTouchStart(e: TouchEvent) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
    function onTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const g = stateRef.current;
      if (g.phase === "idle" || g.phase === "over") { startGame(); return; }
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      let nd: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        nd = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      } else {
        nd = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      }
      const cur = g.dir;
      if (nd.x === -cur.x && nd.y === -cur.y) return;
      g.nextDir = nd;
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtScore = (n: number) => String(n).padStart(5, "0");

  return (
    <div className="flex h-full flex-col gap-1">
      {/* 조선 스타일 스코어 바 */}
      <div className="flex items-center justify-center gap-4">
        <div className="rounded border border-yellow-700 bg-[#1a1423] px-3 py-0.5 text-xs font-bold tracking-widest text-yellow-400">
          🐍 SCORE: {fmtScore(display.score)}
        </div>
        <div className="rounded border border-yellow-700 bg-[#1a1423] px-3 py-0.5 text-xs font-bold tracking-widest text-yellow-400">
          🏆 HIGH: {fmtScore(display.highScore)}
        </div>
      </div>

      {/* 캔버스 */}
      <div className="relative flex-1 flex items-center justify-center rounded-lg bg-[#1a1423]">
        <canvas ref={canvasRef} className="block" />

        {display.phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a1423]/85">
            <p className="font-bold tracking-widest text-yellow-400" style={{ fontFamily: "serif" }}>
              용의 숨
            </p>
            <p className="text-xs tracking-[0.3em] text-yellow-600">JOSEON SNAKE</p>
            <p className="mt-2 text-xs text-yellow-500/70">분석 기다리는 동안 즐겨보세요</p>
            <p className="text-xs text-yellow-600/50">아무 키 / 화면 터치로 시작</p>
          </div>
        )}

        {display.phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a1423]/85">
            <p className="font-bold tracking-widest text-red-400" style={{ fontFamily: "serif" }}>
              게임 오버
            </p>
            <p className="text-xs text-yellow-500">{fmtScore(display.score)} 점</p>
            <p className="mt-1 text-xs text-yellow-600/50">아무 키 / 터치로 재시작</p>
          </div>
        )}
      </div>
    </div>
  );
}
