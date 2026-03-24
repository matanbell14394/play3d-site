'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const CW = 440, CH = 570;
const TEAL = '#00e5cc', GOLD = '#ffd700', PINK = '#ff2d78';

const PRIZES = [
  { label: '5% הנחה',     desc: 'קוד הנחה על הזמנה הבאה',      color: '#7b69ee', rarity: 'נפוץ',    tier: 0, w: 0.30 },
  { label: 'ייעוץ חינם',  desc: 'שיחת ייעוץ 3D מקצועית',       color: '#4a9eff', rarity: 'נפוץ',    tier: 0, w: 0.25 },
  { label: '10% הנחה',    desc: 'קוד הנחה מיוחד',               color: TEAL,      rarity: 'בינוני',  tier: 1, w: 0.20 },
  { label: 'דגם 3D חינם', desc: 'עיצוב דגם לבחירתך',           color: '#ff7c1f', rarity: 'בינוני',  tier: 1, w: 0.15 },
  { label: '15% הנחה',    desc: 'קוד נדיר! עד סוף החודש',       color: PINK,      rarity: '🔥 נדיר', tier: 2, w: 0.08 },
  { label: 'הדפסה חינם!', desc: 'הדפסה אחת בחינם לחלוטין',     color: GOLD,      rarity: '⭐ אגדי', tier: 3, w: 0.02 },
];

const PITY_R = 8, PITY_L = 30; // guaranteed rare after 8, legendary after 30

type Phase = 'idle' | 'spinning' | 'dispensing' | 'reveal';
type Ball  = { x: number; y: number; vx: number; vy: number; pi: number };
type Pt    = { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number };

const GCX = CW / 2, GCY = 200, GR = 126;
const BR = 12, NB = 13;
const TUBE_TOP = GCY + GR - 4, TUBE_BOT = 476;

function simpleRoll(): number {
  let r = Math.random();
  for (let i = 0; i < PRIZES.length; i++) { r -= PRIZES[i].w; if (r <= 0) return i; }
  return 0;
}

function pitiedRoll(pR: number, pL: number): number {
  if (pL >= PITY_L) return PRIZES.length - 1;
  if (pR >= PITY_R) return Math.random() < 0.8 ? 4 : 5;
  return simpleRoll();
}

function initBalls(): Ball[] {
  return Array.from({ length: NB }, (_, i) => {
    const a = (i / NB) * Math.PI * 2 + Math.random();
    const d = (0.2 + Math.random() * 0.55) * (GR - BR - 8);
    return { x: GCX + d * Math.cos(a), y: GCY + d * Math.sin(a), vx: (Math.random()-.5)*2, vy: (Math.random()-.5)*2, pi: simpleRoll() };
  });
}

export default function BallMachine404() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const [phase,  setPhase]  = useState<Phase>('idle');
  const [prize,  setPrize]  = useState<typeof PRIZES[number] | null>(null);
  const [spins,  setSpins]  = useState(0);
  const [uiPityR, setUiPityR] = useState(0);
  const [uiPityL, setUiPityL] = useState(0);
  const [hist,   setHist]   = useState<number[]>([]);

  const gs = useRef({
    balls:  initBalls(),
    parts:  [] as Pt[],
    sel:    null as Ball | null,
    presel: null as { ball: Ball; pi: number } | null,
    ph:     'idle' as Phase,
    spinT:  0, crank: 0, t: 0,
    pityR:  0, pityL:  0, totalSpins: 0,
    flash:  0, flashCol: TEAL as string, shake: 0,
    history: [] as number[],
    scanX:  0,
  });

  const syncP = useCallback((p: Phase) => { gs.current.ph = p; setPhase(p); }, []);

  const spin = useCallback(() => {
    if (gs.current.ph !== 'idle') return;
    gs.current.spinT = 0; gs.current.presel = null;
    syncP('spinning');
  }, [syncP]);

  const again = useCallback(() => {
    const s = gs.current;
    if (s.sel) {
      s.sel.x = GCX; s.sel.y = GCY - 25;
      s.sel.pi = simpleRoll();
      s.sel.vx = (Math.random()-.5)*4; s.sel.vy = -3;
    }
    s.sel = null; s.presel = null; s.parts = []; s.flash = 0; s.shake = 0;
    syncP('idle');
  }, [syncP]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    let alive = true;

    function burst(x: number, y: number, col: string, n: number, pw = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 4.5) * pw;
        gs.current.parts.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2*pw, life: 1, col, r: (1.5 + Math.random()*3.5)*pw });
      }
    }

    function drawBall(x: number, y: number, pi: number, glow = 0) {
      const c = PRIZES[pi].color;
      if (glow > 0) {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, BR + 14 * glow);
        rg.addColorStop(0, c + Math.round(glow * 160).toString(16).padStart(2, '0'));
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, BR + 14 * glow, 0, Math.PI*2); ctx.fill();
      }
      const g = ctx.createRadialGradient(x-3, y-3, 0.5, x, y, BR);
      g.addColorStop(0, 'rgba(255,255,255,0.82)'); g.addColorStop(0.18, c); g.addColorStop(1, c + '66');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, BR, 0, Math.PI*2); ctx.fill();
      // Shine dot
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x-4, y-4, 3.5, 0, Math.PI*2); ctx.fill();
    }

    function drawHexGrid() {
      const size = 22, h = size * Math.sqrt(3);
      ctx.strokeStyle = 'rgba(0,229,204,0.055)'; ctx.lineWidth = 0.8;
      for (let row = -6; row <= 6; row++) {
        for (let col = -7; col <= 7; col++) {
          const hx = GCX + col * size * 1.5;
          const hy = GCY + row * h + (col % 2 !== 0 ? h / 2 : 0);
          if (Math.hypot(hx - GCX, hy - GCY) > GR - 2) continue;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
            const px = hx + size * 0.88 * Math.cos(a), py = hy + size * 0.88 * Math.sin(a);
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    }

    function tick() {
      if (!alive) return;
      const s = gs.current;
      s.t += 0.016;
      const ph = s.ph;
      const nearEnd = ph === 'spinning' && s.spinT > 108;

      // Physics
      for (const b of s.balls) {
        if (b === s.sel) continue;
        b.vy += 0.1;
        if (ph === 'spinning' && !nearEnd) {
          const dx = b.x - GCX, dy = b.y - GCY, ang = Math.atan2(dy, dx);
          b.vx += Math.cos(ang + Math.PI/2) * 0.42;
          b.vy += Math.sin(ang + Math.PI/2) * 0.42;
        }
        // Pull presel toward center during near-miss
        if (s.presel && b === s.presel.ball && nearEnd) {
          b.vx += (GCX - b.x) * 0.05;
          b.vy += (GCY - b.y) * 0.05;
        }
        b.vx *= 0.965; b.vy *= 0.965;
        b.x += b.vx; b.y += b.vy;
        const dx = b.x - GCX, dy = b.y - GCY, d = Math.hypot(dx, dy), maxD = GR - BR;
        if (d > maxD) {
          const nx = dx/d, ny = dy/d;
          b.x = GCX + nx*maxD; b.y = GCY + ny*maxD;
          const dot = b.vx*nx + b.vy*ny;
          b.vx = (b.vx - 2*dot*nx) * 0.62; b.vy = (b.vy - 2*dot*ny) * 0.62;
        }
      }

      // Spinning
      if (ph === 'spinning') {
        s.spinT++;
        s.crank += nearEnd
          ? 0.02 + Math.sin(s.spinT * 0.35) * 0.012  // slow + wobble
          : 0.14;

        if (s.spinT === 108 && !s.presel) {
          const pi = pitiedRoll(s.pityR, s.pityL);
          let ball = s.balls.find(b => b.pi === pi);
          if (!ball) { ball = s.balls[Math.floor(Math.random()*s.balls.length)]; ball.pi = pi; }
          s.presel = { ball, pi };
        }

        if (s.spinT > 152 && s.presel) {
          s.totalSpins++;
          const pi   = s.presel.pi;
          const tier = PRIZES[pi].tier;
          s.pityR = tier >= 2 ? 0 : s.pityR + 1;
          s.pityL = tier >= 3 ? 0 : s.pityL + 1;
          s.history = [pi, ...s.history].slice(0, 8);
          setSpins(s.totalSpins); setUiPityR(s.pityR); setUiPityL(s.pityL); setHist([...s.history]);
          s.sel = s.presel.ball;
          s.sel.x = GCX; s.sel.y = TUBE_TOP; s.sel.vx = 0; s.sel.vy = 0;
          setPrize(PRIZES[pi]); s.presel = null;
          syncP('dispensing');
        }
      }

      // Dispensing
      if (ph === 'dispensing' && s.sel) {
        s.sel.x = GCX; s.sel.y += 4.5;
        if (s.sel.y >= TUBE_BOT) {
          s.sel.y = TUBE_BOT;
          const tier = PRIZES[s.sel.pi].tier;
          const pc   = PRIZES[s.sel.pi].color;
          const pw   = 1 + tier * 0.6;
          burst(GCX, TUBE_BOT, pc,    30 + tier * 18, pw);
          burst(GCX, TUBE_BOT, '#fff', 10 + tier * 6,  pw * 0.7);
          if (tier >= 2) {
            burst(GCX, TUBE_BOT, pc, 20, pw * 1.2);
            s.shake = tier === 3 ? 22 : 11;
            s.flash = tier === 3 ? 1.0 : 0.7;
            s.flashCol = pc;
          }
          syncP('reveal');
        }
      }

      if (s.flash > 0) s.flash -= 0.022;
      if (s.shake > 0) s.shake--;
      for (const p of s.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life -= 0.017; }
      s.parts = s.parts.filter(p => p.life > 0);
      s.scanX = (s.scanX + 1.4) % (GR * 2 + 80);

      // ── DRAW ──
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random()-.5)*s.shake*.5, (Math.random()-.5)*s.shake*.5);

      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, CW, CH);

      // Grid
      ctx.strokeStyle = 'rgba(0,229,204,0.03)'; ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }

      // Tube
      ctx.fillStyle = '#060b18'; ctx.strokeStyle = TEAL+'30'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(GCX-13, TUBE_TOP, 26, TUBE_BOT-TUBE_TOP+BR+8, [0,0,6,6]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = TEAL+'22'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(GCX-5, TUBE_TOP+4); ctx.lineTo(GCX-5, TUBE_BOT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(GCX+5, TUBE_TOP+4); ctx.lineTo(GCX+5, TUBE_BOT); ctx.stroke();

      // Globe fill
      ctx.fillStyle = '#060c1a'; ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI*2); ctx.fill();

      // Globe interior (clipped)
      ctx.save(); ctx.beginPath(); ctx.arc(GCX, GCY, GR-2, 0, Math.PI*2); ctx.clip();
      drawHexGrid();

      // Scan line
      const sx = GCX - GR + s.scanX;
      if (sx < GCX + GR) {
        const sg = ctx.createLinearGradient(sx-18, 0, sx+18, 0);
        sg.addColorStop(0, 'rgba(0,229,204,0)');
        sg.addColorStop(0.5, 'rgba(0,229,204,0.09)');
        sg.addColorStop(1, 'rgba(0,229,204,0)');
        ctx.fillStyle = sg; ctx.fillRect(sx-18, GCY-GR, 36, GR*2);
      }

      for (const b of s.balls) {
        if (b === s.sel) continue;
        const isPresel = !!(s.presel && b === s.presel.ball);
        const glow = isPresel ? 0.55 + 0.35 * Math.sin(s.t * 10) : 0;
        drawBall(b.x, b.y, b.pi, glow);
      }
      ctx.restore(); // end globe clip

      // Globe ring — pulses to winning color during near-miss
      const ringC = nearEnd && s.presel ? PRIZES[s.presel.pi].color : TEAL;
      const ringA = nearEnd ? 0.65 + 0.35 * Math.sin(s.t * 9) : 1;
      ctx.strokeStyle = ringC; ctx.lineWidth = 2.8; ctx.globalAlpha = ringA;
      ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;

      // Glass highlights
      ctx.strokeStyle = 'rgba(255,255,255,0.17)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(GCX-42, GCY-50, 60, -0.7, 0.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(GCX-27, GCY-34, 28, -0.9, 0.15); ctx.stroke();

      // Globe outer glow
      const ogl = ctx.createRadialGradient(GCX, GCY, GR, GCX, GCY, GR+32);
      ogl.addColorStop(0, ringC + '1e'); ogl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ogl; ctx.beginPath(); ctx.arc(GCX, GCY, GR+32, 0, Math.PI*2); ctx.fill();

      // Bolts around globe
      for (let i = 0; i < 8; i++) {
        const ba = (i/8)*Math.PI*2;
        const bx = GCX+(GR+7)*Math.cos(ba), by = GCY+(GR+7)*Math.sin(ba);
        ctx.fillStyle = '#1a2540'; ctx.strokeStyle = TEAL+'70'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Cross mark inside bolt
        ctx.strokeStyle = TEAL+'50'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(bx-1.5, by); ctx.lineTo(bx+1.5, by);
        ctx.moveTo(bx, by-1.5); ctx.lineTo(bx, by+1.5); ctx.stroke();
      }

      // Stand
      ctx.fillStyle = '#0e1628'; ctx.strokeStyle = '#1e2d4a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(GCX-14, GCY+GR-2, 28, TUBE_BOT-(GCY+GR)-10, 4); ctx.fill(); ctx.stroke();

      // Base
      ctx.fillStyle = '#111827'; ctx.strokeStyle = '#263048'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(GCX-88, TUBE_BOT+BR+2, 176, 34, 10); ctx.fill(); ctx.stroke();
      // Base accent stripe
      const bGrad = ctx.createLinearGradient(GCX-88, 0, GCX+88, 0);
      bGrad.addColorStop(0, TEAL+'00'); bGrad.addColorStop(0.5, TEAL+'55'); bGrad.addColorStop(1, TEAL+'00');
      ctx.fillStyle = bGrad; ctx.fillRect(GCX-88, TUBE_BOT+BR+4, 176, 3);
      // Label plate
      ctx.fillStyle = '#0c1522'; ctx.strokeStyle = TEAL+'40'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(GCX-44, TUBE_BOT+BR+9, 88, 20, 4); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = TEAL+'99';
      ctx.fillText('PLAY3D  GACHA', GCX, TUBE_BOT+BR+22);

      // Output glow
      const selC = s.sel ? PRIZES[s.sel.pi].color : TEAL;
      const og = ctx.createRadialGradient(GCX, TUBE_BOT, 0, GCX, TUBE_BOT, BR+16);
      og.addColorStop(0, selC+'55'); og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(GCX, TUBE_BOT, BR+16, 0, Math.PI*2); ctx.fill();

      // Dispensing / revealed ball
      if (s.sel && (ph === 'dispensing' || ph === 'reveal')) {
        const tier = PRIZES[s.sel.pi].tier;
        const glow = ph === 'reveal' ? 0.65 + 0.35 * Math.sin(s.t * 6) : 0.25;
        drawBall(s.sel.x, s.sel.y, s.sel.pi, glow);
        if (ph === 'reveal') {
          // Pulsing rings (more for higher tiers)
          for (let r = 0; r <= tier; r++) {
            const pulse = (s.t * 4 + r * 0.7) % 1;
            ctx.strokeStyle = PRIZES[s.sel.pi].color;
            ctx.lineWidth = 1.5 - pulse;
            ctx.globalAlpha = (1 - pulse) * 0.5;
            ctx.beginPath(); ctx.arc(s.sel.x, s.sel.y, BR + 6 + pulse * 22, 0, Math.PI*2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }

      // Crank
      const crX = GCX + GR + 20, crY = GCY;
      ctx.save(); ctx.translate(crX, crY); ctx.rotate(s.crank);
      ctx.strokeStyle = '#1a2540'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0,-29); ctx.lineTo(0,29); ctx.moveTo(-29,0); ctx.lineTo(29,0); ctx.stroke();
      ctx.strokeStyle = TEAL; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0,-29); ctx.lineTo(0,29); ctx.moveTo(-29,0); ctx.lineTo(29,0); ctx.stroke();
      ctx.fillStyle = nearEnd ? (s.presel ? PRIZES[s.presel.pi].color : TEAL) : TEAL;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(29, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111827'; ctx.strokeStyle = TEAL; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Particles
      for (const p of s.parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Screen flash
      if (s.flash > 0) {
        ctx.fillStyle = s.flashCol + Math.round(Math.max(0, s.flash) * 55).toString(16).padStart(2,'0');
        ctx.fillRect(0, 0, CW, CH);
      }

      ctx.restore(); // end shake

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pityLeft = PITY_R - uiPityR;
  const legLeft  = PITY_L - uiPityL;

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 8, direction: 'rtl' }}>
          <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(20px,4.5vw,34px)', fontWeight: 900, color: TEAL, textShadow: `0 0 22px ${TEAL}80`, lineHeight: 1 }}>404</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>הדף לא נמצא • סובב ונסה את מזלך!</div>
        </div>

        <canvas
          ref={canvasRef} width={CW} height={CH}
          onClick={phase === 'idle' ? spin : undefined}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '57vh', borderRadius: 16, border: '1px solid var(--border)', cursor: phase === 'idle' ? 'pointer' : 'default' }}
        />

        {/* Prize legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 9, maxWidth: 400, direction: 'rtl' }}>
          {PRIZES.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: p.color, background: p.color+'18', border: `1px solid ${p.color}40`, borderRadius: 20, padding: '3px 9px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
              {p.label}
            </div>
          ))}
        </div>

        {/* Pity counters */}
        {spins > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, direction: 'rtl', flexWrap: 'wrap', justifyContent: 'center' }}>
            {pityLeft > 0 && pityLeft <= 5 && (
              <div style={{ color: PINK, background: PINK+'18', border: `1px solid ${PINK}40`, borderRadius: 20, padding: '3px 10px', fontWeight: 700 }}>
                {pityLeft === 1 ? '🔥 הבא מובטח נדיר!' : `🔥 עוד ${pityLeft} לנדיר מובטח`}
              </div>
            )}
            {legLeft > 0 && legLeft <= 15 && (
              <div style={{ color: GOLD, background: GOLD+'18', border: `1px solid ${GOLD}40`, borderRadius: 20, padding: '3px 10px' }}>
                {legLeft === 1 ? '⭐ הבא מובטח אגדי!!' : `⭐ עוד ${legLeft} לאגדי מובטח`}
              </div>
            )}
            <div style={{ color: 'var(--text3)', borderRadius: 20, padding: '3px 10px', border: '1px solid var(--border)', fontSize: 10 }}>
              סיבוב #{spins}
            </div>
          </div>
        )}

        {/* History row */}
        {hist.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4, direction: 'rtl' }}>היסטוריה:</span>
            {hist.map((pi, i) => (
              <div key={i} title={PRIZES[pi].label} style={{ width: 16, height: 16, borderRadius: '50%', background: PRIZES[pi].color, boxShadow: `0 0 6px ${PRIZES[pi].color}80`, flexShrink: 0, opacity: 1 - i * 0.09 }} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 80 }}>
          {phase === 'idle' && (
            <>
              <button onClick={spin} className="btn-hero" style={{ fontSize: 14, padding: '11px 40px' }}>🎰 סובב!</button>
              <Link href="/" style={{ color: 'var(--text3)', fontSize: 12, textDecoration: 'none' }}>← חזרה לדף הבית</Link>
            </>
          )}

          {phase === 'spinning' && (
            <div style={{ fontSize: 13, color: TEAL }}>✨ מסובב...</div>
          )}

          {phase === 'reveal' && prize && (
            <div style={{ textAlign: 'center', direction: 'rtl' }}>
              <div style={{ fontSize: 11, color: prize.color, fontWeight: 700, marginBottom: 2 }}>{prize.rarity}</div>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(18px,4.5vw,30px)', fontWeight: 900, color: prize.color, textShadow: `0 0 20px ${prize.color}`, marginBottom: 3 }}>
                {prize.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>{prize.desc}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={again} className="btn-hero" style={{ fontSize: 13, padding: '10px 26px' }}>🎰 שוב!</button>
                <Link href="/" className="btn-ghost" style={{ display: 'inline-block', fontSize: 13, padding: '10px 20px' }}>דף הבית</Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
