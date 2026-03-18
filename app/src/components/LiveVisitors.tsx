'use client';

import { useEffect, useState } from 'react';

export default function LiveVisitors() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let sessionId = sessionStorage.getItem('_sid');
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2);
      sessionStorage.setItem('_sid', sessionId);
    }

    const beat = () =>
      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(r => r.json())
        .then(d => { if (typeof d.count === 'number') setCount(d.count); })
        .catch(() => {});

    beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
  }, []);

  if (count === null || count === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      background: 'rgba(5,7,15,0.85)',
      border: '1px solid rgba(0,229,204,0.25)',
      borderRadius: 24,
      padding: '6px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 0 16px rgba(0,229,204,0.1)',
      fontSize: 12,
      color: 'var(--text2)',
      fontFamily: 'var(--font-noto-hebrew), sans-serif',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#10b981',
        boxShadow: '0 0 8px #10b981',
        display: 'inline-block',
        animation: 'pulse 2s infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: '#10b981', fontWeight: 700 }}>{count}</span>
      <span>{count === 1 ? 'גולש' : 'גולשים'} כעת</span>
    </div>
  );
}
