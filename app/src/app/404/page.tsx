'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const CW = 420, CH = 540;
const TEAL = '#00e5cc', GOLD = '#ffd700', PINK = '#ff2d78';

const PRIZES = [
  { label: '5% הנחה',      desc: 'קוד הנחה על הזמנה הבאה',     color: '#7b69ee', rarity: 'נפוץ',      w: 0.30 },
  { label: 'ייעוץ חינם',   desc: 'שיחת ייעוץ 3D מקצועית',      color: '#4a9eff', rarity: 'נפוץ',      w: 0.25 },
  { label: '10% הנחה',     desc: 'קוד הנחה מיוחד',              color: TEAL,      rarity: 'בינוני',    w: 0.20 },
  { label: 'דגם 3D חינם',  desc: 'עיצוב דגם תלת מימד לבחירתך', color: '#ff7c1f', rarity: 'בינוני',    w: 0.15 },
  { label: '15% הנחה',     desc: 'קוד הנחה נדיר!',              color: PINK,      rarity: '🔥 נדיר',   w: 0.08 },
  { label: 'הדפסה חינם!',  desc: 'הדפסה אחת בחינם לחלוטין',    color: GOLD,      rarity: '⭐ אגדי',   w: 0.02 },
];

type Phase = 'idle' | 'spinning' | 'dispensing' | 'reveal';
type Ball = { x: number; y: number; vx: number; vy: number; pi: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string; r: number };

const GCX = CW / 2, GCY = 188, GR = 122;
const BR = 12, NB = 12;
const TUBE_TOP = GCY + GR - 4, TUBE_BOT = 460;

function roll(): number {
  let r = Math.random();
  for (let i = 0; i < PRIZES.length; i++) { r -= PRIZES[i].w; if (r <= 0) return i; }
  return PRIZES.length - 1;
}

function initBalls(): Ball[] {
  return Array.from({ length: NB }, (_, i) => {
    const a = (i / NB) * Math.PI * 2 + Math.random();
    const d = (0.2 + Math.random() * 0.58) * (GR - BR - 8);
    return { x: GCX + d * Math.cos(a), y: GCY + d * Math.sin(a), vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, pi: roll() };
  });
}

export default function BallMachine404() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [prize, setPrize] = useState<typeof PRIZES[number] | null>(null);
  const gs = useRef({
    balls: initBalls(), parts: [] as Particle[],
    sel: null as Ball | null,
    ph: 'idle' as Phase,
    spinT: 0, crank: 0, t: 0,
  });

  const syncP = useCallback((p: Phase) => { gs.current.ph = p; setPhase(p); }, []);

  const spin = useCallback(() => {
    if (gs.current.ph !== 'idle') return;
    gs.current.spinT = 0;
    syncP('spinning');
  }, [syncP]);

  const again = useCallback(() => {
    const s = gs.current;
    if (s.sel) {
      s.sel.x = GCX; s.sel.y = GCY - 30;
      s.sel.pi = roll();
      s.sel.vx = (Math.random() - .5) * 3; s.sel.vy = -2;
    }
    s.sel = null; s.parts = [];
    syncP('idle');
  }, [syncP]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let alive = true;

    function burst(x: number, y: number, col: string, n: number) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4.5;
        gs.current.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, col, r: 1.5 + Math.random() * 3.5 });
      }
    }

    function tick() {
      if (!alive) return;
      const s = gs.current;
      s.t += 0.016;
      const ph = s.ph;

      // Physics
      for (const b of s.balls) {
        if (b === s.sel) continue;
        b.vy += 0.1;
        if (ph === 'spinning') {
          const dx = b.x - GCX, dy = b.y - GCY, ang = Math.atan2(dy, dx);
          b.vx += Math.cos(ang + Math.PI / 2) * 0.42;
          b.vy += Math.sin(ang + Math.PI / 2) * 0.42;
        }
        b.vx *= 0.965; b.vy *= 0.965;
        b.x += b.vx; b.y += b.vy;
        const dx = b.x - GCX, dy = b.y - GCY, dist = Math.hypot(dx, dy), maxD = GR - BR;
        if (dist > maxD) {
          const nx = dx / dist, ny = dy / dist;
          b.x = GCX + nx * maxD; b.y = GCY + ny * maxD;
          const dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.62;
          b.vy = (b.vy - 2 * dot * ny) * 0.62;
        }
      }

      if (ph === 'spinning') {
        s.spinT++; s.crank += 0.14;
        if (s.spinT > 145) {
          const pi = roll();
          let ball = s.balls.find(b => b.pi === pi);
          if (!ball) { ball = s.balls[0]; ball.pi = pi; }
          s.sel = ball;
          ball.x = GCX; ball.y = TUBE_TOP; ball.vx = 0; ball.vy = 0;
          setPrize(PRIZES[pi]);
          syncP('dispensing');
        }
      }

      if (ph === 'dispensing' && s.sel) {
        s.sel.x = GCX; s.sel.y += 4;
        if (s.sel.y >= TUBE_BOT) {
          s.sel.y = TUBE_BOT;
          burst(GCX, TUBE_BOT, PRIZES[s.sel.pi].color, 40);
          burst(GCX, TUBE_BOT, '#fff', 14);
          syncP('reveal');
        }
      }

      for (const p of s.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life -= 0.019; }
      s.parts = s.parts.filter(p => p.life > 0);

      // ── DRAW ──
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, CW, CH);

      // Grid
      ctx.strokeStyle = 'rgba(0,229,204,0.035)'; ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

      // Tube
      ctx.fillStyle = '#060b18'; ctx.strokeStyle = TEAL + '35'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(GCX - 13, TUBE_TOP, 26, TUBE_BOT - TUBE_TOP + BR + 6, [0, 0, 6, 6]); ctx.fill(); ctx.stroke();

      // Globe fill
      ctx.fillStyle = '#070d1e';
      ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI * 2); ctx.fill();

      // Balls (clipped)
      ctx.save();
      ctx.beginPath(); ctx.arc(GCX, GCY, GR - 2, 0, Math.PI * 2); ctx.clip();
      for (const b of s.balls) {
        if (b === s.sel) continue;
        const c = PRIZES[b.pi].color;
        const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 0.5, b.x, b.y, BR);
        g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.22, c); g.addColorStop(1, c + '66');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // Globe ring
      ctx.strokeStyle = TEAL; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(GCX, GCY, GR, 0, Math.PI * 2); ctx.stroke();
      // Glass highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(GCX - 42, GCY - 50, 60, -0.7, 0.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(GCX - 30, GCY - 36, 30, -0.9, 0.15); ctx.stroke();

      // Globe outer glow
      const ogl = ctx.createRadialGradient(GCX, GCY, GR, GCX, GCY, GR + 28);
      ogl.addColorStop(0, 'rgba(0,229,204,0.12)'); ogl.addColorStop(1, 'rgba(0,229,204,0)');
      ctx.fillStyle = ogl; ctx.beginPath(); ctx.arc(GCX, GCY, GR + 28, 0, Math.PI * 2); ctx.fill();

      // Stand column
      ctx.fillStyle = '#0e1628'; ctx.strokeStyle = '#1e2d4a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(GCX - 14, GCY + GR - 2, 28, TUBE_BOT - (GCY + GR) - 8, 4); ctx.fill(); ctx.stroke();

      // Base platform
      ctx.fillStyle = '#111827'; ctx.strokeStyle = '#263048'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(GCX - 84, TUBE_BOT + BR + 2, 168, 30, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = TEAL + '35'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(GCX - 82, TUBE_BOT + BR + 4, 164, 26, 9); ctx.stroke();

      // Output glow
      const selC = s.sel ? PRIZES[s.sel.pi].color : TEAL;
      const og = ctx.createRadialGradient(GCX, TUBE_BOT, 0, GCX, TUBE_BOT, BR + 14);
      og.addColorStop(0, selC + '60'); og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(GCX, TUBE_BOT, BR + 14, 0, Math.PI * 2); ctx.fill();

      // Dispensing / revealed ball
      if (s.sel && (ph === 'dispensing' || ph === 'reveal')) {
        const c = PRIZES[s.sel.pi].color;
        const g = ctx.createRadialGradient(s.sel.x - 3, s.sel.y - 3, 0.5, s.sel.x, s.sel.y, BR);
        g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.22, c); g.addColorStop(1, c + '66');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.sel.x, s.sel.y, BR, 0, Math.PI * 2); ctx.fill();
        // Pulse ring on reveal
        if (ph === 'reveal') {
          const pulse = 0.7 + 0.3 * Math.sin(s.t * 8);
          ctx.strokeStyle = c; ctx.lineWidth = 2 * pulse; ctx.globalAlpha = pulse * 0.6;
          ctx.beginPath(); ctx.arc(s.sel.x, s.sel.y, BR + 6 + 4 * (1 - pulse), 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Crank
      const crX = GCX + GR + 18, crY = GCY;
      ctx.save(); ctx.translate(crX, crY); ctx.rotate(s.crank);
      ctx.strokeStyle = '#1a2540'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 28); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.strokeStyle = TEAL; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 28); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.fillStyle = TEAL; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(28, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111827'; ctx.strokeStyle = TEAL; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Particles
      for (const p of s.parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 10, direction: 'rtl' }}>
          <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(22px,5vw,36px)', fontWeight: 900, color: TEAL, textShadow: `0 0 22px ${TEAL}80`, lineHeight: 1 }}>404</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>הדף לא נמצא • סובב ונסה את מזלך!</div>
        </div>

        <canvas
          ref={canvasRef} width={CW} height={CH}
          onClick={phase === 'idle' ? spin : undefined}
          style={{ display: 'block', maxWidth: '100%', maxHeight: '58vh', borderRadius: 16, border: '1px solid var(--border)', cursor: phase === 'idle' ? 'pointer' : 'default' }}
        />

        {/* Prize legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10, maxWidth: 380, direction: 'rtl' }}>
          {PRIZES.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: p.color, background: p.color + '18', border: `1px solid ${p.color}40`, borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
              {p.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 90 }}>
          {phase === 'idle' && (
            <>
              <button onClick={spin} className="btn-hero" style={{ fontSize: 14, padding: '11px 38px' }}>🎰 סובב!</button>
              <Link href="/" style={{ color: 'var(--text3)', fontSize: 12, textDecoration: 'none' }}>← חזרה לדף הבית</Link>
            </>
          )}

          {phase === 'spinning' && (
            <div style={{ fontSize: 14, color: TEAL, animation: 'pulse 0.8s ease-in-out infinite' }}>✨ מסובב...</div>
          )}

          {phase === 'reveal' && prize && (
            <div style={{ textAlign: 'center', direction: 'rtl' }}>
              <div style={{ fontSize: 11, color: prize.color, fontWeight: 700, marginBottom: 2 }}>{prize.rarity}</div>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(20px,5vw,32px)', fontWeight: 900, color: prize.color, textShadow: `0 0 18px ${prize.color}`, marginBottom: 3 }}>
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
