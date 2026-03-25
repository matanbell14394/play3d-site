'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import SiteNav from '@/components/SiteNav';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS       = 20;
const ROWS       = 20;
const CELL       = 22;      // px per grid cell
const INIT_MS    = 190;     // initial snake step interval (ms)
const MIN_MS     = 60;
const SPEED_STEP = 4;       // ms reduction per food eaten
const FALL_BASE  = 820;     // ms per tetromino row-drop
const FALL_MIN   = 210;
const FALL_STEP  = 11;      // ms reduction per food eaten
const SPAWN_INT  = 5200;    // ms between tetromino spawns
const MAX_TETROS = 4;
const LS_KEY     = 'ff_best';

type Phase = 'idle' | 'playing' | 'dead';
type Dir   = 'U' | 'D' | 'L' | 'R';
interface Pos   { x: number; y: number }
interface Tetro { id: number; cells: Pos[]; color: string }

// Tetromino definitions
const T_DEF: Record<string, { pts: [number, number][]; color: string }> = {
  I: { pts: [[0,0],[1,0],[2,0],[3,0]], color: '#22d3ee' },
  O: { pts: [[0,0],[1,0],[0,1],[1,1]], color: '#facc15' },
  T: { pts: [[1,0],[0,1],[1,1],[2,1]], color: '#c084fc' },
  S: { pts: [[1,0],[2,0],[0,1],[1,1]], color: '#4ade80' },
  Z: { pts: [[0,0],[1,0],[1,1],[2,1]], color: '#f87171' },
  J: { pts: [[0,0],[0,1],[1,1],[2,1]], color: '#60a5fa' },
  L: { pts: [[2,0],[0,1],[1,1],[2,1]], color: '#fb923c' },
};
const T_KEYS = Object.keys(T_DEF);

// ─── Audio ────────────────────────────────────────────────────────────────────
function beep(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
  try {
    const ac  = new AudioContext();
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(); osc.stop(ac.currentTime + dur);
    osc.onended = () => ac.close();
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pk(p: Pos): string { return `${p.x},${p.y}`; }

function randFood(blocked: Set<string>): Pos {
  let p: Pos;
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (blocked.has(pk(p)));
  return p;
}

function newTetro(id: number): Tetro {
  const key  = T_KEYS[Math.floor(Math.random() * T_KEYS.length)];
  const def  = T_DEF[key];
  const maxX = Math.max(...def.pts.map(([x]) => x));
  const ox   = Math.floor(Math.random() * (COLS - maxX));
  return { id, cells: def.pts.map(([x, y]) => ({ x: ox + x, y: y - 4 })), color: def.color };
}

// ─── API ──────────────────────────────────────────────────────────────────────
type LBEntry = { id: number; name: string; score: number };
async function fetchLB(): Promise<LBEntry[]> {
  try { return await (await fetch('/api/leaderboard')).json(); } catch { return []; }
}
async function postLB(name: string, score: number): Promise<LBEntry | null> {
  try {
    const tr = await fetch(`/api/leaderboard/token?score=${score}`);
    if (!tr.ok) return null;
    const { token } = await tr.json() as { token: string };
    const r = await fetch('/api/leaderboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token }),   // score is inside the signed token
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FilamentFeed() {
  // All mutable game state lives here — never triggers renders
  const gs = useRef({
    phase:   'idle' as Phase,
    snake:   [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }] as Pos[],
    dir:     'R' as Dir,
    nextDir: 'R' as Dir,
    food:    { x: 15, y: 10 } as Pos,
    frozen:  new Map<string, string>(),   // posKey → color
    tetros:  [] as Tetro[],
    score:   0,
    snakeMs: INIT_MS,
    fallMs:  FALL_BASE,
    nextId:  0,
  });

  // Minimal React state — only for UI
  const [, setTick]     = useState(0);
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [score,  setScore]  = useState(0);
  const [best,   setBest]   = useState(0);
  const [lb,     setLb]     = useState<LBEntry[]>([]);
  const [myId,   setMyId]   = useState<number | null>(null);
  const [name,   setName]   = useState('');
  const [subbing, setSub]   = useState(false);
  const [sent,   setSent]   = useState(false);

  const bump = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem(LS_KEY) ?? '0') || 0); } catch {}
    fetchLB().then(setLb);
  }, []);

  // ── Die ───────────────────────────────────────────────────────────────────
  const die = useCallback(() => {
    const s = gs.current;
    s.phase = 'dead';
    beep(160, 0.12, 'sawtooth', 0.1);
    setTimeout(() => beep(110, 0.35, 'sawtooth', 0.08), 120);
    setPhase('dead');
    setBest(prev => {
      const nb = Math.max(prev, s.score);
      try { localStorage.setItem(LS_KEY, String(nb)); } catch {}
      return nb;
    });
    setScore(s.score);
  }, []);

  // ── Move snake ────────────────────────────────────────────────────────────
  const moveSnake = useCallback(() => {
    const s = gs.current;
    if (s.phase !== 'playing') return;
    s.dir = s.nextDir;
    const h = s.snake[0];
    let nx = h.x, ny = h.y;
    if (s.dir === 'U') ny--;
    if (s.dir === 'D') ny++;
    if (s.dir === 'L') nx--;
    if (s.dir === 'R') nx++;

    // Wall
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { die(); bump(); return; }

    const nk  = `${nx},${ny}`;
    const ate = nx === s.food.x && ny === s.food.y;

    // Self — skip tail if not eating (tail will vacate)
    if ((ate ? s.snake : s.snake.slice(0, -1)).some(p => pk(p) === nk)) { die(); bump(); return; }

    // Frozen block
    if (s.frozen.has(nk)) { die(); bump(); return; }

    // Active tetromino (in-grid only)
    if (s.tetros.some(t => t.cells.some(c => c.y >= 0 && pk(c) === nk))) { die(); bump(); return; }

    // Advance
    s.snake = [{ x: nx, y: ny }, ...s.snake];
    if (!ate) s.snake.pop();

    if (ate) {
      s.score++;
      s.snakeMs = Math.max(MIN_MS,   s.snakeMs - SPEED_STEP);
      s.fallMs  = Math.max(FALL_MIN, s.fallMs  - FALL_STEP);
      const blocked = new Set([...s.frozen.keys(), ...s.snake.map(pk)]);
      s.food = randFood(blocked);
      beep(780, 0.06, 'sine', 0.13);
      setTimeout(() => beep(1040, 0.05, 'sine', 0.10), 45);
      setScore(s.score);
    }
    bump();
  }, [die, bump]);

  // ── Drop tetrominos ───────────────────────────────────────────────────────
  const dropTetros = useCallback(() => {
    const s = gs.current;
    if (s.phase !== 'playing') return;

    const snakeSet = new Set(s.snake.map(pk));
    let frozen     = new Map(s.frozen);
    const survived: Tetro[] = [];
    let died       = false;

    for (const t of s.tetros) {
      const moved   = t.cells.map(c => ({ x: c.x, y: c.y + 1 }));
      const blocked = moved.some(c => c.y >= ROWS || frozen.has(pk(c)));

      if (blocked) {
        for (const c of t.cells) {
          if (c.y < 0) continue;
          frozen.set(pk(c), t.color);
          if (snakeSet.has(pk(c))) died = true;
        }
        beep(220, 0.09, 'square', 0.06);
      } else {
        survived.push({ ...t, cells: moved });
      }
    }

    if (died) {
      s.frozen = frozen; s.tetros = survived;
      die(); bump(); return;
    }

    // Clear full rows
    const counts = new Map<number, number>();
    for (const k of frozen.keys()) {
      const y = parseInt(k.split(',')[1]);
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    const fullRows = [...counts.entries()]
      .filter(([, c]) => c >= COLS).map(([y]) => y).sort((a, b) => b - a);

    if (fullRows.length > 0) {
      const cleared = new Map<string, string>();
      for (const [k, color] of frozen) {
        const [kx, ky] = k.split(',').map(Number);
        if (fullRows.includes(ky)) continue;
        const drop = fullRows.filter(fr => fr > ky).length;
        cleared.set(`${kx},${ky + drop}`, color);
      }
      frozen = cleared;
      beep(660, 0.08, 'triangle', 0.10);
      setTimeout(() => beep(880, 0.10, 'triangle', 0.08), 70);
      s.score += fullRows.length * 5;
      setScore(s.score);
    }

    s.frozen = frozen;
    s.tetros = survived;
    bump();
  }, [die, bump]);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const s   = gs.current;
    s.phase   = 'playing';
    s.snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    s.dir     = 'R'; s.nextDir = 'R';
    s.frozen  = new Map(); s.tetros = [];
    s.score   = 0;
    s.snakeMs = INIT_MS; s.fallMs = FALL_BASE; s.nextId = 0;
    s.food    = randFood(new Set(s.snake.map(pk)));
    setPhase('playing'); setScore(0); setSent(false);
    beep(440, 0.05, 'sine', 0.08);
    setTimeout(() => beep(660, 0.05, 'sine', 0.08), 60);
    bump();
  }, [bump]);

  // ── D-pad direction handler ────────────────────────────────────────────────
  const handleDir = useCallback((d: Dir) => {
    const s = gs.current;
    if (s.phase !== 'playing') { startGame(); return; }
    const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
    if (d !== opp[s.dir]) s.nextDir = d;
  }, [startGame]);

  // ── Grid scale for small screens ──────────────────────────────────────────
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const avail = window.innerWidth - 32; // account for px-4
      setScale(avail < COLS * CELL ? avail / (COLS * CELL) : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const s = gs.current;
      const DIR: Record<string, Dir> = {
        ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
        KeyW: 'U', KeyS: 'D', KeyA: 'L', KeyD: 'R',
      };
      const d = DIR[e.code];
      if (d && s.phase === 'playing') {
        e.preventDefault();
        const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
        if (d !== opp[s.dir]) s.nextDir = d;
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && s.phase !== 'playing') {
        e.preventDefault(); startGame();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [startGame]);

  // Touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      touchRef.current = null;
      const s = gs.current;
      if (s.phase !== 'playing') { startGame(); return; }
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx < 10 && ady < 10) return;
      const opp: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
      const d: Dir = adx > ady ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      if (d !== opp[s.dir]) s.nextDir = d;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [startGame]);

  // ── Snake interval (self-adjusting) ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(() => {
        moveSnake();
        if (gs.current.phase === 'playing') schedule();
      }, gs.current.snakeMs);
    };
    schedule();
    return () => clearTimeout(id);
  }, [phase, moveSnake]);

  // ── Tetromino fall (self-adjusting) ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(() => {
        dropTetros();
        if (gs.current.phase === 'playing') schedule();
      }, gs.current.fallMs);
    };
    schedule();
    return () => clearTimeout(id);
  }, [phase, dropTetros]);

  // ── Tetromino spawn ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const s = gs.current;
      if (s.phase === 'playing' && s.tetros.length < MAX_TETROS) {
        s.tetros = [...s.tetros, newTetro(s.nextId++)];
        bump();
      }
    }, SPAWN_INT);
    return () => clearInterval(id);
  }, [phase, bump]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!name.trim() || subbing || sent || score < 1) return;
    setSub(true);
    const entry = await postLB(name.trim(), score);
    setSub(false);
    if (entry) { setMyId(entry.id); setSent(true); fetchLB().then(setLb); }
  }, [name, score, subbing, sent]);

  // ── Build render maps ─────────────────────────────────────────────────────
  const s = gs.current;
  const snakeMap = new Map<string, number>();
  for (let i = 0; i < s.snake.length; i++) snakeMap.set(pk(s.snake[i]), i);
  const tetroMap = new Map<string, string>();
  for (const t of s.tetros)
    for (const c of t.cells)
      if (c.y >= 0 && c.y < ROWS) tetroMap.set(pk(c), t.color);

  const rankCol = ['text-yellow-400', 'text-slate-300', 'text-orange-400'];

  return (
    <>
      <SiteNav />

      <main
        dir="rtl"
        className="min-h-screen bg-[#060810] text-white flex items-center justify-center px-4 pt-20 pb-8"
        onClick={() => { if (gs.current.phase !== 'playing') startGame(); }}
      >
        <div className="flex gap-5 items-start">

          {/* ─── Left panel ────────────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-4 w-[155px] flex-shrink-0 select-none">

            {/* LED display */}
            <div
              className="rounded-sm border border-[#111828] p-3 flex flex-col gap-1.5"
              style={{ background: '#08090f', boxShadow: 'inset 0 1px 16px rgba(0,0,0,0.8)' }}
            >
              <div className="font-mono text-[10px] tracking-[0.18em]" style={{ color: '#1a4060' }}>
                FILAMENT FEED
              </div>
              <div className="font-mono text-[14px] tracking-wider mt-1">
                <span style={{ color: '#2a6090' }}>SCORE: </span>
                <span style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34,211,238,0.6)' }}>
                  {score.toLocaleString()}
                </span>
              </div>
              {best > 0 && (
                <div className="font-mono text-[12px] tracking-wider">
                  <span style={{ color: '#1a3a55' }}>BEST:  </span>
                  <span style={{ color: '#60a5fa' }}>{best.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Printer status */}
            <div
              className="rounded-sm border border-[#111828] p-3 flex flex-col gap-1"
              style={{ background: '#08090f', boxShadow: 'inset 0 1px 16px rgba(0,0,0,0.8)' }}
            >
              <div className="font-mono text-[10px] tracking-[0.18em] mb-1" style={{ color: '#2a1a05' }}>
                PRINTER STATUS
              </div>
              <div className="font-mono text-[12px] tracking-wider" style={{ color: '#fb923c' }}>
                TEMP: 215°C
              </div>
              <div className="font-mono text-[12px] tracking-wider" style={{ color: '#fb923c' }}>
                BED:  60°C
              </div>
              <div
                className="font-mono text-[11px] tracking-wider mt-1.5"
                style={{
                  color: phase === 'playing' ? '#4ade80'
                    : phase === 'dead'    ? '#f87171'
                    : '#2a5030',
                  textShadow: phase === 'playing' ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
                }}
              >
                {phase === 'playing' ? '● PRINTING...'
                  : phase === 'dead'  ? '✕ PRINT FAILED'
                  : '○ READY'}
              </div>
            </div>

            {/* Controls */}
            <div
              className="rounded-sm border border-[#111828] p-3 flex flex-col gap-1.5"
              style={{ background: '#08090f', boxShadow: 'inset 0 1px 16px rgba(0,0,0,0.8)' }}
            >
              <div className="font-mono text-[10px] tracking-[0.18em] mb-0.5" style={{ color: '#1a3a5a' }}>
                CONTROLS
              </div>
              {[['↑↓←→', 'לנוע'], ['WASD', 'חלופי'], ['SPACE', 'התחל']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px]" style={{ color: '#3a6a8a' }}>{k}</span>
                  <span className="font-mono text-[11px]" style={{ color: '#2a4a60' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Game grid ─────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">

            {/* Mobile score bar */}
            <div className="lg:hidden flex items-center justify-between w-full mb-1">
              <span className="font-mono text-[14px]" style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34,211,238,0.5)' }}>
                SCORE: {score}
              </span>
              {best > 0 && (
                <span className="font-mono text-[13px]" style={{ color: '#60a5fa' }}>BEST: {best}</span>
              )}
            </div>

            <div className="flex items-center justify-between px-0.5" style={{ width: COLS * CELL * scale }}>
              <span className="font-mono text-[8px] tracking-[0.3em]" style={{ color: '#0e1a2e' }}>404</span>
              <span className="font-mono text-[8px] tracking-[0.2em]" style={{ color: '#0e1a2e' }}>
                FILAMENT FEED — SNAKE × TETRIS
              </span>
            </div>

            {/* Scale wrapper */}
            <div style={{ width: COLS * CELL * scale, height: ROWS * CELL * scale, flexShrink: 0 }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div
              className="relative rounded-sm"
              style={{
                width:  COLS * CELL,
                height: ROWS * CELL,
                background: '#050709',
                boxShadow: [
                  '0 0 0 1px rgba(20,40,80,0.7)',
                  '0 0 0 2px rgba(10,20,50,0.5)',
                  '0 0 50px rgba(0,50,140,0.15)',
                  'inset 0 0 80px rgba(0,8,30,0.6)',
                ].join(','),
              }}
              onClick={e => { if (gs.current.phase === 'playing') e.stopPropagation(); }}
            >
              {/* Grid lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={COLS * CELL}
                height={ROWS * CELL}
              >
                {Array.from({ length: COLS - 1 }).map((_, i) => (
                  <line key={`v${i}`}
                    x1={(i+1)*CELL} y1={0} x2={(i+1)*CELL} y2={ROWS*CELL}
                    stroke="#3b82f6" strokeWidth={0.5} strokeOpacity={0.055}
                  />
                ))}
                {Array.from({ length: ROWS - 1 }).map((_, i) => (
                  <line key={`h${i}`}
                    x1={0} y1={(i+1)*CELL} x2={COLS*CELL} y2={(i+1)*CELL}
                    stroke="#3b82f6" strokeWidth={0.5} strokeOpacity={0.055}
                  />
                ))}
              </svg>

              {/* Frozen blocks */}
              {[...s.frozen.entries()].map(([k, col]) => {
                const [cx, cy] = k.split(',').map(Number);
                return (
                  <div key={`f${k}`} style={{
                    position: 'absolute',
                    left: cx*CELL + 1, top: cy*CELL + 1,
                    width: CELL - 2, height: CELL - 2,
                    borderRadius: 2,
                    background: `${col}15`,
                    border: `1px solid ${col}50`,
                    boxShadow: `inset 0 0 5px ${col}25`,
                  }} />
                );
              })}

              {/* Active tetrominos */}
              {[...tetroMap.entries()].map(([k, col]) => {
                const [cx, cy] = k.split(',').map(Number);
                return (
                  <div key={`t${k}`} style={{
                    position: 'absolute',
                    left: cx*CELL + 1, top: cy*CELL + 1,
                    width: CELL - 2, height: CELL - 2,
                    borderRadius: 2,
                    background: `${col}22`,
                    border: `1px solid ${col}dd`,
                    boxShadow: `0 0 8px ${col}88, inset 0 0 4px ${col}44`,
                  }} />
                );
              })}

              {/* Food — glowing star */}
              {phase === 'playing' && (() => {
                const [fx, fy] = pk(s.food).split(',').map(Number);
                return (
                  <div
                    className="ff-food"
                    style={{
                      position: 'absolute',
                      left: fx * CELL, top: fy * CELL,
                      width: CELL, height: CELL,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, lineHeight: 1, color: '#fb923c',
                    }}
                  >
                    ✦
                  </div>
                );
              })()}

              {/* Snake */}
              {[...snakeMap.entries()].map(([k, idx]) => {
                const [cx, cy] = k.split(',').map(Number);
                const isHead = idx === 0;
                const t      = s.snake.length > 1 ? idx / (s.snake.length - 1) : 0;
                const col    = `hsl(${215 - t * 20},${80 - t * 20}%,${62 - t * 22}%)`;
                return (
                  <div key={`s${k}`} style={{
                    position: 'absolute',
                    left:   cx * CELL + (isHead ? 0 : 1),
                    top:    cy * CELL + (isHead ? 0 : 1),
                    width:  isHead ? CELL     : CELL - 2,
                    height: isHead ? CELL     : CELL - 2,
                    borderRadius: isHead ? 4 : 2,
                    background: isHead
                      ? 'linear-gradient(140deg,#bfdbfe 0%,#3b82f6 55%,#1e40af 100%)'
                      : `${col}22`,
                    border: `1px solid ${isHead ? '#60a5fa' : col + '88'}`,
                    boxShadow: isHead
                      ? '0 0 12px rgba(96,165,250,0.85),0 0 24px rgba(96,165,250,0.35)'
                      : `0 0 3px ${col}44`,
                    zIndex: isHead ? 20 : 10,
                  }}>
                    {isHead && (
                      /* Extruder nozzle dot */
                      <div style={{
                        position: 'absolute', bottom: 2, left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4, height: 4, borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 0 4px #fff, 0 0 8px rgba(200,230,255,0.8)',
                      }} />
                    )}
                  </div>
                );
              })}

              {/* Overlay: idle / dead */}
              {phase !== 'playing' && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-sm"
                  style={{ background: 'rgba(5,7,9,0.9)', backdropFilter: 'blur(2px)', zIndex: 50 }}
                >
                  {phase === 'idle' ? (
                    <>
                      <div
                        className="font-mono text-[14px] tracking-[0.45em]"
                        style={{ color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.7)' }}
                      >
                        FILAMENT FEED
                      </div>
                      <div className="font-mono text-[12px] tracking-[0.3em]" style={{ color: '#2a6080' }}>
                        SNAKE × TETRIS
                      </div>
                      <div className="flex gap-4 mt-2">
                        {Object.values(T_DEF).map((d, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-sm"
                            style={{
                              background: d.color,
                              boxShadow: `0 0 6px ${d.color}99`,
                              opacity: 0.7,
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 font-mono text-[12px] tracking-[0.15em]" style={{ color: '#3a6a8a' }}>
                        SPACE · ENTER · לחץ להתחיל
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="font-mono text-[13px] tracking-[0.4em]"
                        style={{ color: '#f87171', textShadow: '0 0 8px rgba(248,113,113,0.5)' }}
                      >
                        PRINT FAILED
                      </div>
                      <div
                        className="font-mono tabular-nums leading-none mt-1"
                        style={{ fontSize: 52, fontWeight: 200, color: '#fff' }}
                      >
                        {score}
                      </div>
                      <div className="font-mono text-[12px] tracking-[0.2em]" style={{ color: '#3a5878' }}>
                        שכבות הודפסו
                      </div>

                      {score >= 1 && !sent && (
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            maxLength={20}
                            placeholder="שמך"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); e.stopPropagation(); }}
                            className="w-28 rounded-sm text-white text-xs text-center px-2 py-1.5 outline-none transition-colors placeholder:text-slate-700"
                            style={{
                              background: '#080a12',
                              border: '1px solid #1e3050',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onBlur={e  => { e.currentTarget.style.borderColor = '#1e3050'; }}
                          />
                          <button
                            onClick={e => { e.stopPropagation(); submit(); }}
                            disabled={!name.trim() || subbing}
                            className="font-mono px-2.5 py-1.5 text-[10px] rounded-sm transition-all disabled:opacity-20"
                            style={{
                              background: '#080a12',
                              border: '1px solid #1e3050',
                              color: '#3a6a8a',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color       = '#22d3ee';
                              e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color       = '#3a6a8a';
                              e.currentTarget.style.borderColor = '#1e3050';
                            }}
                          >
                            {subbing ? '…' : 'שמור'}
                          </button>
                        </div>
                      )}
                      {sent && (
                        <p className="font-mono text-[10px]" style={{ color: 'rgba(74,222,128,0.6)' }}>
                          ✓ נשמר
                        </p>
                      )}
                      <div className="font-mono text-[12px] mt-2" style={{ color: '#2a4a6a' }}>
                        לחץ לשחק שוב
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            </div>{/* end scale transform */}
            </div>{/* end scale wrapper */}

            {/* D-pad — mobile only */}
            <div
              dir="ltr"
              className="lg:hidden flex flex-col items-center gap-2 mt-3 select-none"
              onClick={e => e.stopPropagation()}
            >
              {/* Up */}
              <button
                onPointerDown={e => { e.preventDefault(); handleDir('U'); }}
                style={{ width: 60, height: 60, background: '#08090f', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, color: '#22d3ee', fontSize: 24, cursor: 'pointer', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              >↑</button>
              {/* Middle row */}
              <div className="flex gap-2">
                <button
                  onPointerDown={e => { e.preventDefault(); handleDir('L'); }}
                  style={{ width: 60, height: 60, background: '#08090f', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, color: '#22d3ee', fontSize: 24, cursor: 'pointer', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                >←</button>
                <div style={{ width: 60, height: 60, background: 'rgba(34,211,238,0.04)', borderRadius: 10, border: '1px solid rgba(34,211,238,0.08)' }} />
                <button
                  onPointerDown={e => { e.preventDefault(); handleDir('R'); }}
                  style={{ width: 60, height: 60, background: '#08090f', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, color: '#22d3ee', fontSize: 24, cursor: 'pointer', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
                >→</button>
              </div>
              {/* Down */}
              <button
                onPointerDown={e => { e.preventDefault(); handleDir('D'); }}
                style={{ width: 60, height: 60, background: '#08090f', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 10, color: '#22d3ee', fontSize: 24, cursor: 'pointer', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              >↓</button>
            </div>
          </div>

          {/* ─── Leaderboard ───────────────────────────────────────────────── */}
          <div
            className="hidden lg:flex flex-col gap-0 w-[155px] flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="rounded-sm border border-[#111828] p-3"
              style={{ background: '#08090f', boxShadow: 'inset 0 1px 16px rgba(0,0,0,0.8)' }}
            >
              <div
                className="font-mono text-[11px] tracking-[0.22em] mb-2 pb-1.5"
                style={{ color: '#2a4a6a', borderBottom: '1px solid #111828' }}
              >
                LEADERBOARD
              </div>
              {lb.length === 0 ? (
                <div className="font-mono text-[12px] text-center py-4" style={{ color: '#1e3050' }}>—</div>
              ) : lb.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-center gap-1.5 py-1"
                  style={{ color: e.id === myId ? '#4ade80' : '#3a5878' }}
                >
                  <span
                    className={`w-4 text-right font-mono text-[11px] flex-shrink-0 ${rankCol[i] ?? ''}`}
                    style={!rankCol[i] ? { color: '#1e3050' } : {}}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-mono text-[11px] truncate">{e.name}</span>
                  <span className="font-mono text-[11px] tabular-nums flex-shrink-0">{e.score}</span>
                </div>
              ))}
            </div>

            <Link
              href="/"
              className="mt-4 font-mono text-[11px] transition-colors"
              style={{ color: '#1e3050' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#3a6a8a'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#1e3050'; }}
              onClick={e => e.stopPropagation()}
            >
              ← בית
            </Link>
          </div>

        </div>
      </main>

    </>
  );
}
