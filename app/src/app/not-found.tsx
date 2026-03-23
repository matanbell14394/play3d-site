'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

const CW = 660;
const CH = 280;
const HIT_R = 22;
const GAME_TIME = 35;
const TEAL = '#00e5cc';
const PINK = '#ff2d78';

type Pt = { x: number; y: number };
type Stroke = Pt[];

function lerp(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: a.x + (b.x - a.x) * (i / n),
    y: a.y + (b.y - a.y) * (i / n),
  }));
}

function ovalPts(cx: number, cy: number, rx: number, ry: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

function build404(): { strokes: Stroke[]; wpts: Pt[] } {
  const T = 36, B = CH - 36;
  const MID = (T + B) / 2 + 12;
  const dw = (CW - 80) / 3;
  const lx = 28;
  const strokes: Stroke[] = [];

  // "4" left
  const s0x = lx + dw * 0.68;
  strokes.push(lerp({ x: s0x, y: T }, { x: lx + 6, y: MID }, 20));
  strokes.push(lerp({ x: lx + 6, y: MID }, { x: lx + dw * 0.92, y: MID }, 14));
  strokes.push(lerp({ x: s0x, y: T }, { x: s0x, y: B }, 24));

  // "0"
  const cx = lx + dw * 1.5, cy = (T + B) / 2;
  strokes.push(ovalPts(cx, cy, dw * 0.43, (B - T) / 2 * 0.91, 44));

  // "4" right
  const rx2 = lx + dw * 2;
  const s2x = rx2 + dw * 0.68;
  strokes.push(lerp({ x: s2x, y: T }, { x: rx2 + 6, y: MID }, 20));
  strokes.push(lerp({ x: rx2 + 6, y: MID }, { x: rx2 + dw * 0.92, y: MID }, 14));
  strokes.push(lerp({ x: s2x, y: T }, { x: s2x, y: B }, 24));

  return { strokes, wpts: strokes.flat() };
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number };

function drawNozzle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Carriage body
  ctx.fillStyle = '#1e2a4a';
  ctx.strokeStyle = 'rgba(0,229,204,0.5)';
  ctx.lineWidth = 1;
  const bx = x - 12, by = y - 36, bw = 24, bh = 20;
  ctx.beginPath();
  ctx.moveTo(bx + 4, by);
  ctx.lineTo(bx + bw - 4, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 4);
  ctx.lineTo(bx + bw, by + bh - 4);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 4, by + bh);
  ctx.lineTo(bx + 4, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 4);
  ctx.lineTo(bx, by + 4);
  ctx.quadraticCurveTo(bx, by, bx + 4, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vent lines on body
  ctx.strokeStyle = 'rgba(0,229,204,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const lx2 = bx + 5 + i * 7;
    ctx.beginPath();
    ctx.moveTo(lx2, by + 5);
    ctx.lineTo(lx2, by + bh - 5);
    ctx.stroke();
  }

  // Heater block
  ctx.fillStyle = '#2d3a5e';
  ctx.strokeStyle = 'rgba(255,45,120,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x - 7, y - 16, 14, 10);
  ctx.fill();
  ctx.stroke();

  // Nozzle taper
  ctx.fillStyle = '#c0c8e0';
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 6);
  ctx.lineTo(x + 6, y - 6);
  ctx.lineTo(x + 2, y);
  ctx.lineTo(x - 2, y);
  ctx.closePath();
  ctx.fill();

  // Tip glow
  const grd = ctx.createRadialGradient(x, y + 1, 0, x, y + 1, 16);
  grd.addColorStop(0, 'rgba(0,229,204,0.85)');
  grd.addColorStop(0.4, 'rgba(0,229,204,0.3)');
  grd.addColorStop(1, 'rgba(0,229,204,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y + 1, 16, 0, Math.PI * 2);
  ctx.fill();

  // Tip dot
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.arc(x, y + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function getLabel(score: number) {
  if (score >= 95) return { icon: '🏆', title: 'הדפסה מושלמת!', msg: 'מדהים! יש לך יד יציבה של הנדסאי.' };
  if (score >= 80) return { icon: '🌟', title: 'הדפסה מעולה', msg: 'כישרון אמיתי! עוד קצת ואתה מומחה.' };
  if (score >= 60) return { icon: '👍', title: 'הדפסה טובה', msg: 'עבודה יפה! הדיוק שלך מרשים.' };
  if (score >= 35) return { icon: '🖨️', title: 'הדפסה בסיסית', msg: 'לא רע! נסה שוב לשפר את הדיוק.' };
  return { icon: '🔄', title: 'הדפסה כושלת', msg: 'ניסיון ראשון? נסה שוב — זה קל יותר!' };
}

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [isOnCanvas, setIsOnCanvas] = useState(false);

  const pathRef = useRef<{ strokes: Stroke[]; wpts: Pt[] }>({ strokes: [], wpts: [] });
  const hitsRef = useRef<boolean[]>([]);
  const drawnRef = useRef<Pt[]>([]);
  const nozzleRef = useRef<Pt>({ x: CW / 2, y: CH / 2 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const getPos = useCallback((clientX: number, clientY: number): Pt => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CW / rect.width),
      y: (clientY - rect.top) * (CH / rect.height),
    };
  }, []);

  const onMove = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'playing') return;
    const pos = getPos(clientX, clientY);
    nozzleRef.current = pos;

    drawnRef.current.push(pos);
    if (drawnRef.current.length > 800) drawnRef.current.splice(0, 200);

    // Filament drop particles
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: pos.x + (Math.random() - 0.5) * 3,
        y: pos.y + 1,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 1.8 + 0.4,
        life: 1,
      });
    }
    if (particlesRef.current.length > 120) particlesRef.current.splice(0, 40);

    // Hit detection
    const { wpts } = pathRef.current;
    const hits = hitsRef.current;
    wpts.forEach((p, i) => {
      if (!hits[i]) {
        const dx = pos.x - p.x, dy = pos.y - p.y;
        if (dx * dx + dy * dy <= HIT_R * HIT_R) hits[i] = true;
      }
    });
    const hitCount = hits.filter(Boolean).length;
    setScore(Math.round((hitCount / wpts.length) * 100));
  }, [getPos]);

  // Render loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;
    let last = performance.now();

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, CW, CH);

      const { strokes, wpts } = pathRef.current;
      const hits = hitsRef.current;
      const drawn = drawnRef.current;
      const nozzle = nozzleRef.current;
      const particles = particlesRef.current;

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(0,229,204,0.04)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < CW; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke(); }
      for (let gy = 0; gy < CH; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke(); }

      // Target strokes — ghost dashed
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      strokes.forEach(stroke => {
        ctx.beginPath();
        stroke.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(0,229,204,0.2)';
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Covered waypoints glow
      wpts.forEach((p, i) => {
        if (!hits[i]) return;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5);
        grd.addColorStop(0, 'rgba(0,229,204,0.9)');
        grd.addColorStop(1, 'rgba(0,229,204,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // User's drawn line
      if (drawn.length > 1) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,229,204,0.15)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        drawn.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,229,204,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        drawn.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }

      // Particles (filament drops)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= dt * 2.5;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(0,229,204,${p.life * 0.75})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nozzle
      drawNozzle(ctx, nozzle.x, nozzle.y);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Events
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
    canvas.addEventListener('mousemove', mm);
    canvas.addEventListener('touchmove', tm, { passive: false });
    return () => { canvas.removeEventListener('mousemove', mm); canvas.removeEventListener('touchmove', tm); };
  }, [phase, onMove]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); setPhase('done'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const startGame = () => {
    pathRef.current = build404();
    hitsRef.current = pathRef.current.wpts.map(() => false);
    drawnRef.current = [];
    particlesRef.current = [];
    nozzleRef.current = { x: CW / 2, y: CH / 2 };
    setScore(0);
    setTimeLeft(GAME_TIME);
    setPhase('playing');
  };

  const { icon, title, msg } = getLabel(score);
  const pct = Math.round((timeLeft / GAME_TIME) * 100);

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 20px 48px', direction: 'rtl' }}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 8 }}>// שגיאה 404</div>
          <h1 className="sh-title" style={{ fontSize: 'clamp(20px,4vw,30px)', marginBottom: 6 }}>
            הדף לא נמצא
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 0 }}>
            {phase === 'intro' ? 'אבל יש כאן משחק הדפסה בינתיים 🖨️' : phase === 'playing' ? 'עקוב אחרי הקו המסומן עם העכבר' : 'סיום הדפסה!'}
          </p>
        </div>

        {/* INTRO */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', maxWidth: 500, padding: '0 8px' }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 24px', marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'right', marginBottom: 20 }}>
                {[
                  { icon: '🎯', title: 'מטרה', desc: 'עקוב אחרי קו ה-404 המסומן' },
                  { icon: '🖱️', title: 'שליטה', desc: 'הזז את העכבר מעל הקווים' },
                  { icon: '⏱️', title: 'זמן', desc: `${GAME_TIME} שניות לכסות כמה שיותר` },
                  { icon: '📊', title: 'ניקוד', desc: 'אחוז הנתיב שכוסה' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={startGame} className="btn-hero" style={{ fontSize: 15, padding: '13px 40px', width: '100%' }}>
                התחל להדפיס
              </button>
            </div>
            <Link href="/" style={{ color: 'var(--text3)', fontSize: 13, textDecoration: 'none' }}>← חזרה לדף הבית</Link>
          </div>
        )}

        {/* PLAYING */}
        {phase === 'playing' && (
          <div style={{ width: '100%', maxWidth: 700 }}>
            {/* HUD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 70 }}>
                <span style={{ fontFamily: 'var(--font-orbitron)', fontSize: 24, fontWeight: 900, color: 'var(--teal)', lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
              </div>
              <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: timeLeft <= 10 ? PINK : `linear-gradient(90deg, ${TEAL}, #00b8a9)`,
                  borderRadius: 4,
                  transition: 'width 1s linear, background 0.4s',
                }} />
              </div>
              <div style={{
                fontFamily: 'var(--font-orbitron)', fontSize: 20, fontWeight: 700,
                color: timeLeft <= 10 ? PINK : 'var(--text)',
                minWidth: 40, textAlign: 'center',
                transition: 'color 0.3s',
              }}>
                {timeLeft}s
              </div>
            </div>

            {/* Canvas */}
            <div style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              border: `1px solid ${isOnCanvas ? 'rgba(0,229,204,0.4)' : 'var(--border)'}`,
              background: 'var(--bg2)',
              boxShadow: isOnCanvas ? '0 0 30px rgba(0,229,204,0.08)' : 'none',
              transition: 'border-color .3s, box-shadow .3s',
            }}>
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                onMouseEnter={() => setIsOnCanvas(true)}
                onMouseLeave={() => setIsOnCanvas(false)}
                style={{ display: 'block', width: '100%', height: 'auto', cursor: 'none', touchAction: 'none' }}
              />
              {!isOnCanvas && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ background: 'rgba(5,7,15,0.7)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: 'var(--text2)' }}>
                    הזז את העכבר לכאן
                  </div>
                </div>
              )}
            </div>

            {/* Score bar */}
            <div style={{ marginTop: 10, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${score}%`,
                background: score >= 80 ? TEAL : score >= 50 ? '#00b8a9' : 'rgba(0,229,204,0.5)',
                borderRadius: 2, transition: 'width 0.15s',
              }} />
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 56, marginBottom: 10, lineHeight: 1 }}>{icon}</div>
            <h2 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, marginBottom: 6 }}>{title}</h2>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 'clamp(48px,10vw,72px)', fontWeight: 900, color: 'var(--teal)', lineHeight: 1, marginBottom: 10, textShadow: '0 0 30px rgba(0,229,204,0.4)' }}>
              {score}%
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>{msg}</p>

            {/* Accuracy bar */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                <span>דיוק הדפסה</span>
                <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{score}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${TEAL}, #00b8a9)`, borderRadius: 4, transition: 'width 1s ease-out' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
                {[
                  { label: 'מאסטר', val: '95%+', active: score >= 95 },
                  { label: 'מומחה', val: '80%+', active: score >= 80 && score < 95 },
                  { label: 'טוב', val: '60%+', active: score >= 60 && score < 80 },
                  { label: 'בסיסי', val: '35%+', active: score >= 35 && score < 60 },
                ].map(r => (
                  <div key={r.label} style={{ flex: 1, padding: '6px 4px', borderRadius: 6, background: r.active ? 'rgba(0,229,204,0.12)' : 'var(--bg3)', border: `1px solid ${r.active ? 'rgba(0,229,204,0.4)' : 'transparent'}`, fontSize: 10, color: r.active ? TEAL : 'var(--text3)', textAlign: 'center', transition: 'all .3s' }}>
                    <div style={{ fontWeight: 700 }}>{r.label}</div>
                    <div style={{ opacity: 0.7 }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={startGame} className="btn-hero" style={{ fontSize: 14, padding: '12px 28px' }}>
                שחק שוב
              </button>
              <Link href="/" className="btn-ghost" style={{ display: 'inline-block', fontSize: 14, padding: '12px 24px' }}>
                חזרה לדף הבית
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
