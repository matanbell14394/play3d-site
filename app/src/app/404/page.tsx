'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

// ─── Canvas constants ──────────────────────────────────────────────────────────
const CW = 560, CH = 390;
const MARGIN    = 50;
const RAIL_Y    = 60;
const NOZZLE_Y  = RAIL_Y + 26;   // heater block centre
const TIP_Y     = NOZZLE_Y + 28; // nozzle tip
const PLATE_Y   = CH - 52;
const LAYER_H   = 5;

// ─── Game tuning ───────────────────────────────────────────────────────────────
const INIT_SPEED  = 2.6;
const SPEED_INC   = 0.19;  // per layer
const MAX_SPEED   = 13;
const INIT_TW     = 90;    // initial target width (px)
const TW_SHRINK   = 3;     // shrink per layer
const MIN_TW      = 22;    // minimum target width
const SPAG_FRAMES = 90;    // spaghetti animation duration

// ─── Colours ──────────────────────────────────────────────────────────────────
const TEAL  = '#00e5cc';
const GREEN = '#00ff66';
const RED   = '#ff3344';
const GOLD  = '#ffd700';

const LAYER_COLORS = [
  '#00e5cc', '#7b69ee', '#ff7c1f',
  '#ff2d78', '#4a9eff', '#ffd700', '#44d62c',
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type Phase    = 'intro' | 'playing' | 'spaghetti' | 'gameover';
type LBEntry  = { id: number; name: string; score: number };
type SpagLine = { x: number; y: number; cpx: number; cpy: number; ex: number; ey: number; col: string; life: number };
type Pt       = { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number };

// ─── API helpers ───────────────────────────────────────────────────────────────
async function fetchLB(): Promise<LBEntry[]> {
  try { return await (await fetch('/api/leaderboard')).json(); } catch { return []; }
}
async function postLB(name: string, score: number): Promise<LBEntry | null> {
  try {
    const r = await fetch('/api/leaderboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// ──────────────────────────────────────────────────────────────────────────────
export default function PerfectLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  // Game state — lives in a ref so the RAF closure always sees fresh values
  const gs = useRef({
    x:       MARGIN + (CW - 2 * MARGIN) / 2,
    dir:     1 as 1 | -1,
    speed:   INIT_SPEED,
    score:   0,
    targetX: MARGIN + (CW - 2 * MARGIN) / 2 - INIT_TW / 2,
    targetW: INIT_TW,
    phase:   'intro' as Phase,
    t:       0,
    spagT:   0,
    flashG:  0,
    flashR:  0,
    shakeX:  0,
    shakeY:  0,
    layers:  [] as string[],
    spaghetti: [] as SpagLine[],
    parts:     [] as Pt[],
  });

  // React state — drives the HTML overlay / leaderboard UI
  const [phase,   setPhase]  = useState<Phase>('intro');
  const [score,   setScore]  = useState(0);
  const [lb,      setLb]     = useState<LBEntry[]>([]);
  const [myId,    setMyId]   = useState<number | null>(null);
  const [name,    setName]   = useState('');
  const [subbing, setSubbing] = useState(false);
  const [sent,    setSent]   = useState(false);

  const syncP = useCallback((p: Phase) => { gs.current.phase = p; setPhase(p); }, []);

  // ── Start / restart game ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const s = gs.current;
    const mid = MARGIN + (CW - 2 * MARGIN) / 2;
    s.x = mid; s.dir = 1; s.speed = INIT_SPEED; s.score = 0;
    s.targetX = mid - INIT_TW / 2; s.targetW = INIT_TW;
    s.flashG = 0; s.flashR = 0; s.shakeX = 0; s.shakeY = 0;
    s.spaghetti = []; s.parts = []; s.layers = []; s.spagT = 0;
    setScore(0); setSent(false);
    syncP('playing');
  }, [syncP]);

  // ── Attempt to place a layer ────────────────────────────────────────────────
  const attempt = useCallback(() => {
    const s = gs.current;
    if (s.phase !== 'playing') return;

    const hit = s.x >= s.targetX && s.x <= s.targetX + s.targetW;

    if (hit) {
      s.score++;
      s.speed    = Math.min(MAX_SPEED, INIT_SPEED + s.score * SPEED_INC);
      s.targetW  = Math.max(MIN_TW, INIT_TW - s.score * TW_SHRINK);
      // Shift target zone every 5 layers to mix it up
      if (s.score % 5 === 0) {
        s.targetX = MARGIN + Math.random() * (CW - 2 * MARGIN - s.targetW);
      }
      s.flashG = 1;
      s.layers.push(LAYER_COLORS[s.score % LAYER_COLORS.length]);
      // Filament burst particles
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.5;
        s.parts.push({ x: s.x, y: TIP_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, col: TEAL, r: 1 + Math.random() * 2 });
      }
      setScore(s.score);
    } else {
      // ── FAIL — trigger spaghetti ────────────────────────────────────────────
      s.flashR = 1; s.shakeX = 10; s.shakeY = 7;
      for (let i = 0; i < 22; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 35 + Math.random() * 90;
        s.spaghetti.push({
          x: s.x, y: TIP_Y,
          cpx: s.x + (Math.random() - .5) * 60,
          cpy: TIP_Y + (Math.random() - .5) * 50,
          ex:  s.x + Math.cos(ang) * dist,
          ey:  TIP_Y + Math.sin(ang) * dist + 20,
          col: LAYER_COLORS[Math.floor(Math.random() * LAYER_COLORS.length)],
          life: 1,
        });
      }
      s.spagT = 0;
      syncP('spaghetti');
    }
  }, [syncP]);

  // ── Universal action handler ────────────────────────────────────────────────
  const action = useCallback(() => {
    const p = gs.current.phase;
    if (p === 'intro')    startGame();
    else if (p === 'playing')  attempt();
    else if (p === 'gameover') startGame();
    // 'spaghetti': wait for animation
  }, [startGame, attempt]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [action]);

  // Load leaderboard on mount
  useEffect(() => { fetchLB().then(setLb); }, []);

  // ── Submit score ────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!name.trim() || subbing || sent) return;
    setSubbing(true);
    const entry = await postLB(name.trim(), score);
    setSubbing(false);
    if (entry) {
      setMyId(entry.id);
      setSent(true);
      fetchLB().then(setLb);
    }
  }, [name, score, subbing, sent]);

  // ── RAF render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    let alive = true;

    // ── Drawing helpers ──────────────────────────────────────────────────────

    function drawBg() {
      ctx.fillStyle = '#050a14';
      ctx.fillRect(0, 0, CW, CH);
      // Dot grid
      ctx.fillStyle = 'rgba(0,229,204,0.055)';
      for (let gx = 0; gx < CW; gx += 28)
        for (let gy = 0; gy < CH; gy += 28) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.9, 0, Math.PI * 2); ctx.fill();
        }
    }

    function drawPlate() {
      // Hatching below plate
      ctx.save();
      ctx.rect(MARGIN - 10, PLATE_Y, CW - 2 * (MARGIN - 10), CH - PLATE_Y);
      ctx.clip();
      ctx.strokeStyle = 'rgba(70,110,160,0.13)'; ctx.lineWidth = 1;
      for (let i = -15; i < 25; i++) {
        ctx.beginPath();
        ctx.moveTo(MARGIN - 10 + i * 18, PLATE_Y);
        ctx.lineTo(MARGIN - 10 + i * 18 + (CH - PLATE_Y), CH);
        ctx.stroke();
      }
      ctx.restore();
      // Plate glow
      const pg = ctx.createLinearGradient(0, PLATE_Y, 0, PLATE_Y + 18);
      pg.addColorStop(0, TEAL + '30'); pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.fillRect(MARGIN - 20, PLATE_Y, CW - 2 * (MARGIN - 20), 18);
      // Plate line
      const lineG = ctx.createLinearGradient(MARGIN - 20, 0, CW - MARGIN + 20, 0);
      lineG.addColorStop(0, 'transparent');
      lineG.addColorStop(0.1, TEAL); lineG.addColorStop(0.9, TEAL);
      lineG.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineG; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(MARGIN - 20, PLATE_Y); ctx.lineTo(CW - MARGIN + 20, PLATE_Y); ctx.stroke();
    }

    function drawLayers(layers: string[]) {
      const maxVisible = Math.floor((PLATE_Y - TIP_Y - 8) / LAYER_H);
      const vis = Math.min(layers.length, maxVisible);
      for (let i = 0; i < vis; i++) {
        const y   = PLATE_Y - (i + 1) * LAYER_H;
        const col = layers[layers.length - 1 - i]; // newest on top
        ctx.fillStyle = col + 'aa';
        ctx.fillRect(MARGIN, y, CW - 2 * MARGIN, LAYER_H - 1);
      }
      if (vis > 0) {
        // Top layer bright highlight
        const topY = PLATE_Y - vis * LAYER_H;
        const topCol = layers[layers.length - 1];
        const tg = ctx.createLinearGradient(0, topY, 0, topY + LAYER_H);
        tg.addColorStop(0, topCol + 'ee'); tg.addColorStop(1, topCol + '55');
        ctx.fillStyle = tg;
        ctx.fillRect(MARGIN, topY, CW - 2 * MARGIN, LAYER_H);
      }
    }

    function drawRail() {
      const rg = ctx.createLinearGradient(0, RAIL_Y - 7, 0, RAIL_Y + 7);
      rg.addColorStop(0,   '#4a5a7a');
      rg.addColorStop(0.35,'#8a9aaa');
      rg.addColorStop(0.5, '#c0d0e0');
      rg.addColorStop(0.65,'#8a9aaa');
      rg.addColorStop(1,   '#3a4a6a');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.roundRect(MARGIN - 22, RAIL_Y - 7, CW - 2 * (MARGIN - 22), 14, 4); ctx.fill();
      // Screws
      for (let x = MARGIN; x <= CW - MARGIN; x += 56) {
        ctx.fillStyle = '#4a5a70';
        ctx.beginPath(); ctx.arc(x, RAIL_Y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8090a8'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(x, RAIL_Y, 4.5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#7090b0'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x - 2.8, RAIL_Y); ctx.lineTo(x + 2.8, RAIL_Y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, RAIL_Y - 2.8); ctx.lineTo(x, RAIL_Y + 2.8); ctx.stroke();
      }
    }

    function drawNozzle(x: number) {
      // Carriage body on rail
      ctx.fillStyle = '#2a3a50';
      ctx.strokeStyle = '#4a5a70'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x - 16, RAIL_Y - 9, 32, 18, 3); ctx.fill(); ctx.stroke();

      // Connecting rod
      ctx.strokeStyle = '#3a4a60'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, RAIL_Y + 9); ctx.lineTo(x, NOZZLE_Y - 7); ctx.stroke();

      // Heater block
      ctx.fillStyle = '#3a2010';
      ctx.beginPath(); ctx.roundRect(x - 12, NOZZLE_Y - 8, 24, 16, 3); ctx.fill();
      ctx.strokeStyle = '#7a4020'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x - 12, NOZZLE_Y - 8, 24, 16, 3); ctx.stroke();
      // Heater coil lines
      ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const hx = x - 7 + i * 6;
        ctx.beginPath(); ctx.moveTo(hx, NOZZLE_Y - 5); ctx.lineTo(hx, NOZZLE_Y + 5); ctx.stroke();
      }
      // Thermal dot
      ctx.fillStyle = '#ff2200';
      ctx.beginPath(); ctx.arc(x, NOZZLE_Y, 2.5, 0, Math.PI * 2); ctx.fill();

      // Heat break (thin, silver)
      const hrg = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
      hrg.addColorStop(0, '#556677'); hrg.addColorStop(0.5, '#99aabb'); hrg.addColorStop(1, '#556677');
      ctx.fillStyle = hrg;
      ctx.beginPath(); ctx.roundRect(x - 3, NOZZLE_Y + 8, 6, 9, 1); ctx.fill();

      // Nozzle body (wider)
      const nbg = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
      nbg.addColorStop(0, '#445566'); nbg.addColorStop(0.5, '#778899'); nbg.addColorStop(1, '#445566');
      ctx.fillStyle = nbg;
      ctx.beginPath();
      ctx.moveTo(x - 6, NOZZLE_Y + 17); ctx.lineTo(x + 6, NOZZLE_Y + 17);
      ctx.lineTo(x + 2, TIP_Y); ctx.lineTo(x - 2, TIP_Y);
      ctx.closePath(); ctx.fill();

      // Tip glow
      const tg = ctx.createRadialGradient(x, TIP_Y, 0, x, TIP_Y, 11);
      tg.addColorStop(0, TEAL + 'dd'); tg.addColorStop(0.5, TEAL + '66'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(x, TIP_Y, 11, 0, Math.PI * 2); ctx.fill();
    }

    function drawTarget(tx: number, tw: number, t: number) {
      const mid  = tx + tw / 2;
      const pulse = 0.7 + 0.3 * Math.sin(t * 5);

      // Background fill
      ctx.fillStyle = 'rgba(0,255,80,0.07)';
      ctx.fillRect(tx, NOZZLE_Y - 26, tw, 52);

      // Dashed border
      ctx.strokeStyle = `rgba(0,255,102,${0.6 * pulse})`; ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(tx, NOZZLE_Y - 26, tw, 52);
      ctx.setLineDash([]);

      // Vertical centre guide
      ctx.strokeStyle = `rgba(0,255,102,${0.4 * pulse})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mid, NOZZLE_Y - 32); ctx.lineTo(mid, NOZZLE_Y + 32); ctx.stroke();

      // Pulsing target dot
      ctx.fillStyle = `rgba(0,255,102,${0.8 * pulse})`;
      ctx.beginPath(); ctx.arc(mid, NOZZLE_Y, 4 + 1.5 * pulse, 0, Math.PI * 2); ctx.fill();

      // Corner triangles
      const cSize = 6;
      ctx.fillStyle = GREEN + 'cc';
      const corners: [number, number][] = [
        [tx,      NOZZLE_Y - 26],
        [tx + tw, NOZZLE_Y - 26],
        [tx,      NOZZLE_Y + 26],
        [tx + tw, NOZZLE_Y + 26],
      ];
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx + (cx > CW/2 ? -cSize : cSize), cy);
        ctx.lineTo(cx, cy + (cy > NOZZLE_Y ? cSize : -cSize));
        ctx.closePath(); ctx.fill();
      }
    }

    function drawSpaghetti(lines: SpagLine[]) {
      for (const l of lines) {
        ctx.strokeStyle = l.col + Math.round(l.life * 180).toString(16).padStart(2, '0');
        ctx.lineWidth = 2.8 * l.life;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.quadraticCurveTo(l.cpx, l.cpy, l.ex, l.ey);
        ctx.stroke();
      }
    }

    function tick() {
      if (!alive) return;
      const s = gs.current;
      s.t += 0.016;
      const ph = s.phase;

      // ── Update ─────────────────────────────────────────────────────────────

      // Move nozzle during play and spaghetti
      if (ph === 'playing' || ph === 'spaghetti') {
        s.x += s.speed * s.dir;
        if (s.x >= CW - MARGIN) { s.x = CW - MARGIN; s.dir = -1; }
        if (s.x <= MARGIN)      { s.x = MARGIN;       s.dir =  1; }
      }

      // Flash decay
      if (s.flashG > 0) s.flashG = Math.max(0, s.flashG - 0.06);
      if (s.flashR > 0) s.flashR = Math.max(0, s.flashR - 0.05);
      if (s.shakeX > 0.2) s.shakeX *= 0.78;
      if (s.shakeY > 0.2) s.shakeY *= 0.78;

      // Spaghetti animation
      if (ph === 'spaghetti') {
        s.spagT++;
        for (const l of s.spaghetti) { l.ey += 2; l.ex += (Math.random() - .5) * 1.5; l.life -= 0.016; }
        s.spaghetti = s.spaghetti.filter(l => l.life > 0);
        if (s.spagT > SPAG_FRAMES) syncP('gameover');
      }

      // Particles
      for (const p of s.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.04; }
      s.parts = s.parts.filter(p => p.life > 0);

      // ── Draw ───────────────────────────────────────────────────────────────
      ctx.save();
      const sx = s.shakeX > 0.2 ? (Math.random() - .5) * s.shakeX : 0;
      const sy = s.shakeY > 0.2 ? (Math.random() - .5) * s.shakeY : 0;
      ctx.translate(sx, sy);

      drawBg();
      drawPlate();
      drawLayers(s.layers);
      if (ph === 'playing') drawTarget(s.targetX, s.targetW, s.t);
      drawRail();
      if (ph !== 'gameover') drawNozzle(s.x);
      if (s.spaghetti.length > 0) drawSpaghetti(s.spaghetti);

      // Particles
      for (const p of s.parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Flash overlays
      if (s.flashG > 0) { ctx.fillStyle = `rgba(0,255,100,${s.flashG * 0.15})`; ctx.fillRect(-10, -10, CW + 20, CH + 20); }
      if (s.flashR > 0) { ctx.fillStyle = `rgba(255,30,40,${s.flashR * 0.22})`;  ctx.fillRect(-10, -10, CW + 20, CH + 20); }

      // Dark dim during gameover
      if (ph === 'gameover') {
        ctx.fillStyle = 'rgba(5,10,20,0.55)';
        ctx.fillRect(0, 0, CW, CH);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived UI values ───────────────────────────────────────────────────────
  const currentSpeed  = INIT_SPEED + score * SPEED_INC;
  const targetPct     = Math.max(0, 1 - (INIT_TW - Math.max(MIN_TW, INIT_TW - score * TW_SHRINK)) / (INIT_TW - MIN_TW));
  const isInTop10     = lb.length < 10 || score > (lb[lb.length - 1]?.score ?? 0);
  const rankColors    = [GOLD, '#b0b8c8', '#cd7f32'];

  return (
    <>
      <SiteNav />
      <main
        id="main-content"
        dir="rtl"
        className="min-h-screen flex flex-col items-center pt-20 pb-10 px-4"
      >
        {/* ── Header ── */}
        <div className="text-center mb-4">
          <h1
            className="font-bold tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(22px,4.5vw,34px)', color: TEAL, textShadow: `0 0 24px ${TEAL}80` }}
          >
            השכבה המושלמת
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text2)' }}>
            404 — הדף הלך לאיבוד בסלייסר
          </p>
        </div>

        {/* ── Game + Leaderboard layout ── */}
        <div className="flex gap-5 items-start justify-center w-full flex-wrap" style={{ maxWidth: 840 }}>

          {/* ── Left: Game ── */}
          <div style={{ flex: '1 1 560px', minWidth: 0 }}>

            {/* Score bar */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--text3)' }}>שכבות</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontFamily: 'var(--font-orbitron)', fontSize: 20, color: TEAL, minWidth: 36, textAlign: 'left' }}
                >
                  {score}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text3)' }}>מהירות</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => {
                    const thr = (i / 5) * (MAX_SPEED - INIT_SPEED) + INIT_SPEED;
                    const filled = currentSpeed >= thr;
                    const barColor = i <= 2 ? TEAL : i <= 4 ? '#ffaa00' : RED;
                    return (
                      <div key={i} style={{ width: 10, height: 18, borderRadius: 3, background: filled ? barColor : 'var(--border)', transition: 'background 0.3s', boxShadow: filled ? `0 0 6px ${barColor}80` : 'none' }} />
                    );
                  })}
                </div>
                <span className="text-xs" style={{ color: 'var(--text3)' }}>אזור מטרה</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => {
                    const filled = targetPct < (1 - (i - 1) / 5);
                    return (
                      <div key={i} style={{ width: 10, height: 18, borderRadius: 3, background: filled ? GREEN : 'var(--border)', boxShadow: filled ? `0 0 6px ${GREEN}60` : 'none' }} />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Canvas + overlays */}
            <div className="relative" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <canvas
                ref={canvasRef}
                width={CW} height={CH}
                onClick={action}
                className="block w-full"
                style={{ maxHeight: '56vh', cursor: phase === 'playing' ? 'crosshair' : 'pointer' }}
              />

              {/* INTRO overlay */}
              {phase === 'intro' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: 'rgba(5,10,20,0.88)' }}>
                  <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(18px,4vw,28px)', color: TEAL, textShadow: `0 0 20px ${TEAL}` }}>
                    השכבה המושלמת
                  </div>
                  <div className="text-sm text-center px-6 leading-relaxed" style={{ color: 'var(--text2)', maxWidth: 340 }}>
                    לחץ <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)' }}>רווח</kbd> או לחץ כשהנוזל מעל האזור הירוק
                  </div>
                  <div className="text-xs text-center" style={{ color: 'var(--text3)' }}>
                    מהירות עולה עם כל שכבה • אזור המטרה מצטמצם • טעות = ספגטי 🍝
                  </div>
                  <button onClick={startGame} className="btn-hero mt-2" style={{ fontSize: 14, padding: '10px 36px' }}>
                    התחל הדפסה
                  </button>
                </div>
              )}

              {/* SPAGHETTI banner (brief) */}
              {phase === 'spaghetti' && (
                <div className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none">
                  <div
                    className="px-6 py-3 rounded-xl font-bold text-2xl"
                    style={{ background: 'rgba(5,10,20,0.80)', color: RED, fontFamily: 'var(--font-orbitron)', border: `1px solid ${RED}60`, textShadow: `0 0 16px ${RED}` }}
                  >
                    🍝 ספגטי!
                  </div>
                </div>
              )}

              {/* GAME OVER overlay */}
              {phase === 'gameover' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6" style={{ background: 'rgba(5,10,20,0.90)' }}>
                  <div className="text-sm font-bold" style={{ color: RED }}>🍝 ספגטי — ההדפסה נכשלה</div>
                  <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(36px,8vw,56px)', fontWeight: 900, color: TEAL, textShadow: `0 0 28px ${TEAL}90`, lineHeight: 1 }}>
                    {score}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text2)' }}>
                    {score === 0 ? 'אפס שכבות…' : score === 1 ? 'שכבה אחת הודפסה' : `${score} שכבות הודפסו בהצלחה`}
                  </div>

                  {score >= 1 && !sent && (
                    <div className="flex flex-col items-center gap-2 w-full" style={{ maxWidth: 270 }}>
                      {isInTop10 && <div className="text-xs" style={{ color: GREEN }}>⭐ הציון שלך מספיק לטופ 10!</div>}
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="שם לשמירת ציון"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submit(); e.stopPropagation(); }}
                        className="w-full text-center text-sm rounded-lg px-3 py-2 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text1)', direction: 'rtl' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={submit}
                          disabled={!name.trim() || subbing}
                          className="btn-hero text-sm px-5 py-2"
                        >
                          {subbing ? '...' : 'שמור ציון'}
                        </button>
                        <button onClick={startGame} className="btn-ghost text-sm px-4 py-2">
                          שוב <span className="opacity-50 text-xs">[רווח]</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {(score === 0 || sent) && (
                    <div className="flex flex-col items-center gap-2">
                      {sent && <div className="text-xs" style={{ color: GREEN }}>✓ הציון נשמר!</div>}
                      <button onClick={startGame} className="btn-hero text-sm px-8 py-2.5">
                        נסה שוב <span className="opacity-50 text-xs">[רווח]</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hint bar */}
            <div className="text-center mt-2 text-xs" style={{ color: 'var(--text3)' }}>
              לחץ <strong>רווח</strong> או לחץ כשהנוזל מעל האזור הירוק ← שכבה מושלמת
            </div>
          </div>

          {/* ── Right: Leaderboard ── */}
          <div style={{ flex: '0 0 210px', minWidth: 170 }}>
            <div
              className="text-center text-sm font-bold mb-3 pb-2"
              style={{ fontFamily: 'var(--font-orbitron)', color: TEAL, borderBottom: '1px solid var(--border)' }}
            >
              לוח תוצאות
            </div>

            <div className="flex flex-col gap-1.5">
              {lb.length === 0 ? (
                <div className="text-center text-xs py-4" style={{ color: 'var(--text3)' }}>
                  עדיין אין שחקנים&nbsp;🖨️
                </div>
              ) : lb.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: e.id === myId ? TEAL + '18' : 'var(--card-bg)',
                    border: `1px solid ${e.id === myId ? TEAL + '55' : 'var(--border)'}`,
                    direction: 'rtl',
                  }}
                >
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ width: 18, textAlign: 'center', color: rankColors[i] ?? 'var(--text3)', flexShrink: 0 }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="flex-1 text-sm truncate"
                    style={{ color: e.id === myId ? TEAL : 'var(--text1)' }}
                  >
                    {e.name}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-orbitron)', color: e.id === myId ? TEAL : 'var(--text2)', flexShrink: 0 }}
                  >
                    {e.score}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/"
              className="block text-center text-xs mt-4"
              style={{ color: 'var(--text3)', textDecoration: 'none' }}
            >
              ← חזרה לדף הבית
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
