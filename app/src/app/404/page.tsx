'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import SiteNav from '@/components/SiteNav';
import Link from 'next/link';

// ─── Tuning ────────────────────────────────────────────────────────────────────
const INIT_SPEED = 1.8;   // px / frame at layer 0
const SPEED_INC  = 0.008; // → MAX at ~1 400 layers
const MAX_SPEED  = 13;
const INIT_TW    = 88;    // initial target width (px)
const TW_SHRINK  = 0.049; // → MIN at ~1 400 layers
const MIN_TW     = 20;
const HIT_TOL    = 8;     // px tolerance each side of nozzle centre

type Phase   = 'idle' | 'playing' | 'dead';
type LBEntry = { id: number; name: string; score: number };

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
  // DOM refs for direct RAF manipulation (no re-renders)
  const trackRef  = useRef<HTMLDivElement>(null);
  const nozzleRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const areaRef   = useRef<HTMLDivElement>(null);

  // Game state — lives entirely in a ref; never triggers React renders
  const gs = useRef({
    x:         400,
    dir:       1 as 1 | -1,
    speed:     INIT_SPEED,
    score:     0,
    targetX:   356,
    targetW:   INIT_TW,
    phase:     'idle' as Phase,
    trackW:    800,
    flashT:    0,
    flashType: '' as '' | 'hit' | 'miss',
  });

  // React state — only for overlay / leaderboard UI
  const [phase,   setPhase]  = useState<Phase>('idle');
  const [score,   setScore]  = useState(0);
  const [lb,      setLb]     = useState<LBEntry[]>([]);
  const [myId,    setMyId]   = useState<number | null>(null);
  const [name,    setName]   = useState('');
  const [subbing, setSub]    = useState(false);
  const [sent,    setSent]   = useState(false);

  const syncP = useCallback((p: Phase) => { gs.current.phase = p; setPhase(p); }, []);

  // ── Start / restart ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const tw = trackRef.current?.offsetWidth ?? 800;
    const s  = gs.current;
    s.trackW  = tw;
    s.x       = tw / 2;
    s.dir     = 1;
    s.speed   = INIT_SPEED;
    s.score   = 0;
    s.targetW = INIT_TW;
    s.targetX = tw / 2 - INIT_TW / 2;
    s.flashT  = 0;
    s.flashType = '';
    // Reset DOM immediately so there's no stale visual
    if (nozzleRef.current)
      nozzleRef.current.style.transform = `translateX(${tw / 2}px) translateX(-50%)`;
    if (targetRef.current) {
      targetRef.current.style.width     = `${INIT_TW}px`;
      targetRef.current.style.transform = `translateX(${s.targetX}px)`;
    }
    setScore(0);
    setSent(false);
    syncP('playing');
  }, [syncP]);

  // ── Attempt a layer ──────────────────────────────────────────────────────────
  const attempt = useCallback(() => {
    const s = gs.current;
    if (s.phase !== 'playing') return;

    const hit = s.x + HIT_TOL >= s.targetX && s.x - HIT_TOL <= s.targetX + s.targetW;

    if (hit) {
      s.score++;
      s.speed   = Math.min(MAX_SPEED, INIT_SPEED + s.score * SPEED_INC);
      s.targetW = Math.max(MIN_TW, INIT_TW - s.score * TW_SHRINK);
      // Jump zone ≥ 80 px from current position
      const playW = s.trackW - s.targetW;
      let newX: number;
      do { newX = Math.random() * playW; }
      while (Math.abs(newX - s.targetX) < 80 && playW > 80);
      s.targetX   = newX;
      s.flashType = 'hit';
      s.flashT    = 16;
      if (targetRef.current) {
        targetRef.current.style.width     = `${s.targetW}px`;
        targetRef.current.style.transform = `translateX(${s.targetX}px)`;
      }
      setScore(s.score);
    } else {
      s.flashType = 'miss';
      s.flashT    = 42;
      setTimeout(() => syncP('dead'), 700);
    }
  }, [syncP]);

  // ── Universal action (space / click) ────────────────────────────────────────
  const action = useCallback(() => {
    const p = gs.current.phase;
    if (p === 'idle' || p === 'dead') startGame();
    else if (p === 'playing') attempt();
  }, [startGame, attempt]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [action]);

  // Leaderboard fetch
  useEffect(() => { fetchLB().then(setLb); }, []);

  // Submit score
  const submit = useCallback(async () => {
    if (!name.trim() || subbing || sent || score < 1) return;
    setSub(true);
    const entry = await postLB(name.trim(), score);
    setSub(false);
    if (entry) { setMyId(entry.id); setSent(true); fetchLB().then(setLb); }
  }, [name, score, subbing, sent]);

  // ── RAF loop — direct DOM, zero re-renders ───────────────────────────────────
  useEffect(() => {
    const nozzle = nozzleRef.current!;
    const target = targetRef.current!;
    const area   = areaRef.current!;
    let raf = 0;

    // Initialise DOM to match gs ref
    const tw = trackRef.current?.offsetWidth ?? 800;
    gs.current.trackW  = tw;
    gs.current.x       = tw / 2;
    gs.current.targetX = tw / 2 - INIT_TW / 2;
    nozzle.style.transform = `translateX(${tw / 2}px) translateX(-50%)`;
    target.style.transform = `translateX(${tw / 2 - INIT_TW / 2}px)`;
    target.style.width     = `${INIT_TW}px`;

    const NOZZLE_BASE = '0 0 8px rgba(96,165,250,0.9), 0 0 20px rgba(96,165,250,0.3)';
    const TARGET_BASE = '0 0 12px rgba(52,211,153,0.35), 0 0 28px rgba(52,211,153,0.12)';

    const tick = () => {
      const s = gs.current;

      // ── Render nozzle at current position, then advance ──────────────────────
      if (s.phase === 'playing') {
        nozzle.style.transform = `translateX(${s.x}px) translateX(-50%)`;
        s.x += s.speed * s.dir;
        if (s.x >= s.trackW) { s.x = s.trackW; s.dir = -1; }
        if (s.x <= 0)         { s.x = 0;         s.dir =  1; }
      }

      // ── Flash & shake effects ────────────────────────────────────────────────
      if (s.flashT > 0) {
        s.flashT--;
        const t     = s.flashT;
        const isHit = s.flashType === 'hit';
        const maxT  = isHit ? 16 : 42;
        const p     = t / maxT; // 1 → 0

        if (!isHit) {
          // Shake
          const mag = p * 6;
          area.style.transform = `translate(${(Math.random() - .5) * mag}px,${(Math.random() - .5) * mag * .4}px)`;
          // Red nozzle
          nozzle.style.backgroundColor = `rgb(239,68,68)`;
          nozzle.style.boxShadow = `0 0 ${p * 22}px rgba(239,68,68,${p}), 0 0 ${p * 44}px rgba(239,68,68,${p * .5})`;
        } else {
          // Emerald flash on nozzle + target
          nozzle.style.backgroundColor = `rgb(52,211,153)`;
          nozzle.style.boxShadow = `0 0 ${p * 22}px rgba(52,211,153,${p}), 0 0 ${p * 44}px rgba(52,211,153,${p * .5})`;
          target.style.boxShadow = `0 0 ${p * 36}px rgba(52,211,153,${p * .9}), 0 0 ${p * 70}px rgba(52,211,153,${p * .4})`;
        }

        if (t === 0) {
          s.flashType = '';
          area.style.transform  = '';
          nozzle.style.backgroundColor = 'rgb(96,165,250)';
          nozzle.style.boxShadow       = NOZZLE_BASE;
          target.style.boxShadow       = TARGET_BASE;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────────
  const speedVal = INIT_SPEED + score * SPEED_INC;
  const rankMeta = ['text-yellow-500', 'text-slate-400', 'text-orange-600'];

  return (
    <>
      <SiteNav />

      <main
        dir="rtl"
        className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-4 sm:px-8 pt-20 pb-12"
        onClick={action}
      >
        <div className="w-full max-w-4xl flex gap-12 items-start">

          {/* ─────────────────────── GAME ─────────────────────────────────── */}
          <div ref={areaRef} className="flex-1 min-w-0 flex flex-col">

            {/* Row: 404 label + title */}
            <div className="flex items-baseline justify-between mb-12">
              <span className="font-mono text-[11px] text-slate-700 tracking-[0.25em]">404</span>
              <h1 className="text-slate-600 text-xs font-light tracking-[0.22em]">
                השכבה המושלמת
              </h1>
            </div>

            {/* Row: score hero + speed meter */}
            <div className="flex items-end justify-between mb-20">
              <div className="flex items-baseline gap-3 leading-none">
                <span className="text-[72px] font-extralight tabular-nums leading-none text-white">
                  {score}
                </span>
                <span className="text-slate-700 text-sm mb-2">שכבות</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-700 text-[10px] font-mono tracking-widest">מהירות</span>
                <div className="flex items-end gap-[3px]">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const thr = INIT_SPEED + (i / 8) * (MAX_SPEED - INIT_SPEED);
                    const on  = speedVal >= thr;
                    const ht  = 8 + i * 2.5;
                    const col = i < 4
                      ? 'rgba(52,211,153,1)'
                      : i < 6 ? 'rgba(250,204,21,1)' : 'rgba(239,68,68,1)';
                    const glow = i < 4
                      ? 'rgba(52,211,153,0.7)'
                      : i < 6 ? 'rgba(250,204,21,0.7)' : 'rgba(239,68,68,0.7)';
                    return (
                      <div
                        key={i}
                        style={{
                          width: 3,
                          height: ht,
                          borderRadius: 1,
                          backgroundColor: on ? col : 'rgba(30,41,59,1)',
                          boxShadow: on ? `0 0 6px ${glow}` : 'none',
                          transition: 'background-color .25s, box-shadow .25s',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Track ─────────────────────────────────────────────────────── */}
            <div
              className="relative select-none"
              style={{ padding: '28px 0', cursor: phase === 'playing' ? 'crosshair' : 'pointer' }}
            >
              <div ref={trackRef} className="relative w-full" style={{ height: 1 }}>

                {/* Track line */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right,transparent,rgba(71,85,105,0.55) 12%,rgba(71,85,105,0.55) 88%,transparent)',
                  }}
                />

                {/* Target zone */}
                <div
                  ref={targetRef}
                  style={{
                    position: 'absolute',
                    top: -5,
                    height: 11,
                    left: 0,
                    borderRadius: 2,
                    background: 'rgba(52,211,153,0.14)',
                    border:     '1px solid rgba(52,211,153,0.42)',
                    boxShadow:  '0 0 12px rgba(52,211,153,0.35), 0 0 28px rgba(52,211,153,0.12)',
                    transition: 'width 0.08s ease-out',
                  }}
                />

                {/* Nozzle cursor */}
                <div
                  ref={nozzleRef}
                  style={{
                    position: 'absolute',
                    top: -17,
                    height: 35,
                    width: 2,
                    left: 0,
                    borderRadius: 1,
                    backgroundColor: 'rgb(96,165,250)',
                    boxShadow: '0 0 8px rgba(96,165,250,0.9), 0 0 20px rgba(96,165,250,0.3)',
                  }}
                />
              </div>
            </div>

            {/* ── State messages ──────────────────────────────────────────────── */}
            <div
              className="mt-16 flex flex-col items-center gap-3 min-h-[72px]"
              onClick={e => phase === 'dead' ? e.stopPropagation() : undefined}
            >
              {phase === 'idle' && (
                <p className="text-slate-600 text-sm text-center leading-relaxed">
                  לחץ{' '}
                  <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                    רווח
                  </kbd>{' '}
                  או לחץ כשהסמן מעל האזור הירוק
                </p>
              )}

              {phase === 'dead' && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-slate-700 text-[10px] font-mono tracking-[0.3em] uppercase">
                    נכשלת
                  </p>

                  {score >= 1 && !sent && (
                    <div
                      className="flex items-center gap-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        maxLength={20}
                        placeholder="שמך"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submit();
                          e.stopPropagation();
                        }}
                        className="
                          w-32 bg-slate-900/80 border border-slate-800 rounded
                          text-white text-sm text-center px-3 py-1.5
                          placeholder:text-slate-700 outline-none
                          focus:border-slate-600 transition-colors
                        "
                      />
                      <button
                        onClick={e => { e.stopPropagation(); submit(); }}
                        disabled={!name.trim() || subbing}
                        className="
                          px-3 py-1.5 text-xs rounded
                          bg-slate-900 border border-slate-800
                          text-slate-500 hover:text-white hover:border-slate-600
                          disabled:opacity-25 transition-all duration-150
                        "
                      >
                        {subbing ? '…' : 'שמור'}
                      </button>
                    </div>
                  )}

                  {sent && (
                    <p className="text-emerald-600/60 text-[11px] font-mono">✓ נשמר</p>
                  )}

                  <p className="text-slate-800 text-[11px]">
                    לחץ רווח / לחץ לשחק שוב
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ──────────────────── LEADERBOARD ─────────────────────────────── */}
          <div
            className="w-44 flex-shrink-0 hidden sm:flex flex-col gap-0 pt-1"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-slate-700 text-[10px] font-mono tracking-[0.28em] mb-3 pb-2 border-b border-slate-900">
              דירוג
            </p>

            {lb.length === 0 ? (
              <p className="text-slate-800 text-xs text-center py-8">—</p>
            ) : (
              <div>
                {lb.map((e, i) => (
                  <div
                    key={e.id}
                    className={`
                      flex items-center gap-2 py-1.5 px-1 rounded-sm
                      ${e.id === myId ? 'text-emerald-500' : 'text-slate-600'}
                    `}
                  >
                    <span
                      className={`w-4 text-right font-mono text-[11px] flex-shrink-0 ${
                        rankMeta[i] ?? 'text-slate-800'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-xs truncate">{e.name}</span>
                    <span className="font-mono text-[11px] tabular-nums flex-shrink-0">
                      {e.score}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/"
              className="mt-10 text-slate-800 text-[11px] font-mono hover:text-slate-500 transition-colors self-start"
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
