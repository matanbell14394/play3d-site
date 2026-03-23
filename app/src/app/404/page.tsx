'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const CW = 480, CH = 620;
const TEAL = '#00e5cc', PINK = '#ff2d78', GOLD = '#ffd700';
const COLS = 9, ROWS = 4;
const EW = 32, EH = 24, EGX = 16, EGY = 20;
const GRID_W = COLS * (EW + EGX) - EGX;
const GSX = (CW - GRID_W) / 2;
const GSY = 60;
const PLAYER_SPEED = 4.5;
const P_BULLET_SPEED = 10;
const E_BULLET_SPEED = 3.2;
const SHOOT_CD = 16;

const ROW = [
  { pts: 40, color: PINK },
  { pts: 30, color: '#ff7c1f' },
  { pts: 20, color: TEAL },
  { pts: 10, color: '#7b69ee' },
];

type Bullet = { x: number; y: number; dy: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number };
type Star = { x: number; y: number; speed: number; size: number };
type Enemy = { alive: boolean; x: number; y: number; row: number; flash: number };
type Shield = { x: number; y: number; hp: number };
type Phase = 'intro' | 'playing' | 'win' | 'gameover';

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean) {
  if (blink) return;
  ctx.save(); ctx.translate(x, y);
  const eg = ctx.createRadialGradient(0, 12, 0, 0, 12, 22);
  eg.addColorStop(0, 'rgba(0,229,204,.55)'); eg.addColorStop(1, 'rgba(0,229,204,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0, 12, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a2540'; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -18); ctx.lineTo(-18, 10); ctx.lineTo(-10, 16); ctx.lineTo(10, 16); ctx.lineTo(18, 10);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#aab4d4';
  ctx.beginPath(); ctx.rect(-5, -6, 10, 10); ctx.fill();
  ctx.fillStyle = TEAL;
  ctx.beginPath(); ctx.arc(0, -18, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,204,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(-9, -5); ctx.moveTo(16, 8); ctx.lineTo(9, -5); ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, t: number) {
  const { color } = ROW[row];
  ctx.save(); ctx.translate(x, y);
  const pulse = 0.88 + 0.12 * Math.sin(t * 2.5 + row * 1.3);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = color; ctx.fillStyle = color + '28'; ctx.lineWidth = 1.5;
  if (row === 0) {
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(-9, -3); ctx.lineTo(-13, 5);
    ctx.lineTo(-6, 11); ctx.lineTo(6, 11); ctx.lineTo(13, 5);
    ctx.lineTo(9, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-9, -18); ctx.moveTo(5, -12); ctx.lineTo(9, -18); ctx.stroke();
  } else if (row === 1) {
    ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(0, -14); ctx.lineTo(7, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-7, -5, 14, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 9, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (row === 2) {
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.rect(-9, -4, 18, 15); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-4, -11); ctx.lineTo(13, -11); ctx.lineTo(9, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(13, -11); ctx.lineTo(13, 5); ctx.lineTo(9, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number) {
  if (hp <= 0) return;
  const a = hp / 3;
  ctx.fillStyle = `rgba(0,229,204,${a * 0.2})`; ctx.strokeStyle = `rgba(0,229,204,${a * 0.65})`; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 28, y + 16); ctx.lineTo(x - 28, y - 8);
  ctx.quadraticCurveTo(x - 28, y - 20, x, y - 20);
  ctx.quadraticCurveTo(x + 28, y - 20, x + 28, y - 8);
  ctx.lineTo(x + 28, y + 16); ctx.lineTo(x + 18, y + 16);
  ctx.lineTo(x + 14, y + 8); ctx.lineTo(x - 14, y + 8); ctx.lineTo(x - 18, y + 16);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function makeState() {
  const enemies: Enemy[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      enemies.push({ alive: true, x: GSX + c * (EW + EGX) + EW / 2, y: GSY + r * (EH + EGY) + EH / 2, row: r, flash: 0 });
  const shields: Shield[] = [CW * 0.2, CW * 0.5, CW * 0.8].map(x => ({ x, y: CH - 110, hp: 3 }));
  const stars: Star[] = Array.from({ length: 90 }, () => ({ x: Math.random() * CW, y: Math.random() * CH, speed: Math.random() * 0.5 + 0.15, size: Math.random() > 0.85 ? 2 : 1 }));
  return { px: CW / 2, py: CH - 48, bullets: [] as Bullet[], eBullets: [] as Bullet[], enemies, shields, particles: [] as Particle[], stars, gridDX: 0.55, shootCD: 0, eShootTimer: 70, score: 0, lives: 3, shake: 0, t: 0, invTimer: 0 };
}

export default function Game404() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [hi, setHi] = useState(0);
  const gs = useRef(makeState());
  const keys = useRef(new Set<string>());
  const raf = useRef(0);

  function spawnParticles(x: number, y: number, color: string, n: number) {
    const s = gs.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 3.5 + 0.8;
      s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color, r: Math.random() * 3 + 1 });
    }
  }

  const start = useCallback(() => { gs.current = makeState(); setScore(0); setLives(3); setPhase('playing'); }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;

    function frame() {
      if (!running) return;
      const s = gs.current;
      s.t += 0.016;

      if (keys.current.has('ArrowLeft') || keys.current.has('a')) s.px = Math.max(20, s.px - PLAYER_SPEED);
      if (keys.current.has('ArrowRight') || keys.current.has('d')) s.px = Math.min(CW - 20, s.px + PLAYER_SPEED);
      if (s.shootCD > 0) s.shootCD--;
      if ((keys.current.has(' ') || keys.current.has('ArrowUp') || keys.current.has('w')) && s.shootCD === 0) {
        s.bullets.push({ x: s.px, y: s.py - 20, dy: -P_BULLET_SPEED });
        s.shootCD = SHOOT_CD;
      }
      if (s.invTimer > 0) s.invTimer--;

      s.bullets = s.bullets.filter(b => b.y > -20);
      for (const b of s.bullets) b.y += b.dy;
      s.eBullets = s.eBullets.filter(b => b.y < CH + 20);
      for (const b of s.eBullets) b.y += b.dy;

      const alive = s.enemies.filter(e => e.alive);
      const speed = s.gridDX * (1 + (ROWS * COLS - alive.length) / (ROWS * COLS) * 2.8);
      for (const e of alive) e.x += speed;
      const lx = Math.min(...alive.map(e => e.x)) - EW / 2;
      const rx = Math.max(...alive.map(e => e.x)) + EW / 2;
      if ((rx >= CW - 10 && s.gridDX > 0) || (lx <= 10 && s.gridDX < 0)) {
        s.gridDX *= -1;
        for (const e of alive) e.y += 22;
      }
      for (const e of s.enemies) if (e.flash > 0) e.flash--;

      if (--s.eShootTimer <= 0 && alive.length > 0) {
        const sh = alive[Math.floor(Math.random() * alive.length)];
        s.eBullets.push({ x: sh.x, y: sh.y + EH / 2, dy: E_BULLET_SPEED });
        s.eShootTimer = Math.max(18, 75 - (ROWS * COLS - alive.length) * 1.8);
      }

      for (const b of s.bullets) {
        for (const e of s.enemies) {
          if (!e.alive) continue;
          if (Math.abs(b.x - e.x) < EW / 2 + 3 && Math.abs(b.y - e.y) < EH / 2 + 3) {
            e.alive = false; b.y = -999;
            s.score += ROW[e.row].pts; setScore(s.score);
            spawnParticles(e.x, e.y, ROW[e.row].color, 14); s.shake = 5;
          }
        }
      }

      for (const b of [...s.bullets, ...s.eBullets]) {
        for (const sh of s.shields) {
          if (sh.hp <= 0) continue;
          if (Math.abs(b.x - sh.x) < 30 && b.y > sh.y - 22 && b.y < sh.y + 18) {
            sh.hp--; b.y = b.dy < 0 ? -999 : CH + 999;
            spawnParticles(b.x, sh.y, TEAL, 5);
          }
        }
      }

      if (s.invTimer === 0) {
        for (const b of s.eBullets) {
          if (Math.abs(b.x - s.px) < 16 && Math.abs(b.y - s.py) < 16) {
            b.y = CH + 999; s.lives--; setLives(s.lives);
            s.invTimer = 130; s.shake = 10;
            spawnParticles(s.px, s.py, TEAL, 20);
            if (s.lives <= 0) { setHi(h => Math.max(h, s.score)); setPhase('gameover'); }
          }
        }
      }

      if (alive.some(e => e.y > CH - 80)) { setHi(h => Math.max(h, s.score)); setPhase('gameover'); }
      if (alive.length === 0) { setHi(h => Math.max(h, s.score)); setPhase('win'); }

      s.particles = s.particles.filter(p => p.life > 0);
      for (const p of s.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.028; }
      for (const st of s.stars) { st.y += st.speed; if (st.y > CH) { st.y = 0; st.x = Math.random() * CW; } }
      if (s.shake > 0) s.shake--;

      // Draw
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - .5) * 5, (Math.random() - .5) * 5);
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, CW, CH);

      for (const st of s.stars) {
        ctx.fillStyle = `rgba(255,255,255,${st.size > 1 ? 0.9 : 0.4})`;
        ctx.fillRect(st.x, st.y, st.size, st.size);
      }

      for (const sh of s.shields) drawShield(ctx, sh.x, sh.y, sh.hp);

      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (e.flash > 0) ctx.globalAlpha = e.flash % 4 < 2 ? 0.3 : 1;
        drawEnemy(ctx, e.x, e.y, e.row, s.t);
        ctx.globalAlpha = 1;
      }

      for (const b of s.bullets) {
        if (b.y < -5) continue;
        const g = ctx.createLinearGradient(b.x, b.y - 24, b.x, b.y + 10);
        g.addColorStop(0, 'rgba(0,229,204,0)'); g.addColorStop(0.4, 'rgba(0,229,204,.9)'); g.addColorStop(1, '#fff');
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y - 24); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,229,204,.2)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(b.x, b.y - 24); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      for (const b of s.eBullets) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 7);
        g.addColorStop(0, PINK); g.addColorStop(1, 'rgba(255,45,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalAlpha = 1;
      for (const p of s.particles) {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawPlayer(ctx, s.px, s.py, s.invTimer > 0 && Math.floor(s.t * 60) % 6 < 3);

      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = TEAL;
      ctx.fillText(`${s.score}`, 10, 20);
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(CW - 14 - i * 20, 14, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      raf.current = requestAnimationFrame(frame);
    }

    raf.current = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(raf.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const dn = (e: KeyboardEvent) => { keys.current.add(e.key); if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [phase]);

  const tLeft  = useCallback((on: boolean) => { if (on) keys.current.add('ArrowLeft');  else keys.current.delete('ArrowLeft');  }, []);
  const tRight = useCallback((on: boolean) => { if (on) keys.current.add('ArrowRight'); else keys.current.delete('ArrowRight'); }, []);
  const tShoot = useCallback(() => { keys.current.add(' '); setTimeout(() => keys.current.delete(' '), 80); }, []);

  const btn = (accent?: boolean): React.CSSProperties => ({
    width: 64, height: 64, borderRadius: 12,
    border: `1px solid ${accent ? TEAL : 'var(--border)'}`,
    background: accent ? 'rgba(0,229,204,.12)' : 'var(--bg2)',
    color: accent ? TEAL : 'var(--text)', fontSize: accent ? 13 : 22,
    fontWeight: 700, cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
  });

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 32px' }}>

        {phase === 'intro' && (
          <div style={{ textAlign: 'center', maxWidth: 420, direction: 'rtl' }}>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(36px,8vw,60px)', fontWeight: 900, color: TEAL, textShadow: `0 0 28px ${TEAL}80`, lineHeight: 1, marginBottom: 8 }}>404</div>
            <h1 style={{ fontSize: 'clamp(16px,4vw,22px)', fontWeight: 700, marginBottom: 6 }}>הדף לא נמצא</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>אבל המדפסת שלנו מוכנה לקרב!</p>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: 'var(--text2)', lineHeight: 2.2, direction: 'rtl' }}>
              <div>← → &nbsp;|&nbsp; A D — תנועה</div>
              <div>רווח &nbsp;|&nbsp; ↑ — ירי פילמנט</div>
              <div>השמד את כל החלליות לפני שיגיעו!</div>
            </div>
            <button onClick={start} className="btn-hero" style={{ fontSize: 15, padding: '13px 44px' }}>התחל</button>
            <div style={{ marginTop: 14 }}>
              <Link href="/" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none' }}>← חזרה לדף הבית</Link>
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block', borderRadius: 14, border: '1px solid var(--border)', maxWidth: '100%', maxHeight: '70vh' }} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <button style={btn()} onPointerDown={() => tLeft(true)} onPointerUp={() => tLeft(false)} onPointerLeave={() => tLeft(false)}>←</button>
              <button style={btn(true)} onPointerDown={tShoot}>ירי</button>
              <button style={btn()} onPointerDown={() => tRight(true)} onPointerUp={() => tRight(false)} onPointerLeave={() => tRight(false)}>→</button>
            </div>
          </div>
        )}

        {(phase === 'win' || phase === 'gameover') && (
          <div style={{ textAlign: 'center', maxWidth: 360, direction: 'rtl' }}>
            <div style={{ fontSize: 54, marginBottom: 10, lineHeight: 1 }}>{phase === 'win' ? '🏆' : '💥'}</div>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(24px,6vw,36px)', fontWeight: 900, color: phase === 'win' ? TEAL : PINK, textShadow: `0 0 24px ${phase === 'win' ? TEAL : PINK}`, marginBottom: 8 }}>
              {phase === 'win' ? 'ניצחת!' : 'GAME OVER'}
            </div>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 52, fontWeight: 900, color: GOLD, textShadow: `0 0 20px ${GOLD}60`, marginBottom: 8 }}>{score}</div>
            {hi > 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22 }}>שיא: {hi}</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={start} className="btn-hero" style={{ fontSize: 14, padding: '12px 30px' }}>שחק שוב</button>
              <Link href="/" className="btn-ghost" style={{ display: 'inline-block', fontSize: 14, padding: '12px 24px' }}>דף הבית</Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
