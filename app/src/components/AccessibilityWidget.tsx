'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Feature = 'big-text' | 'high-contrast' | 'highlight-links' | 'readable-font' | 'stop-animations';

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Feature[]>([]);

  // Load saved prefs
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('a11y_prefs') || '[]') as Feature[];
    setActive(saved);
    applyFeatures(saved);
  }, []);

  function applyFeatures(features: Feature[]) {
    const root = document.documentElement;
    root.classList.toggle('a11y-big-text', features.includes('big-text'));
    root.classList.toggle('a11y-high-contrast', features.includes('high-contrast'));
    root.classList.toggle('a11y-highlight-links', features.includes('highlight-links'));
    root.classList.toggle('a11y-readable-font', features.includes('readable-font'));
    root.classList.toggle('a11y-stop-animations', features.includes('stop-animations'));
  }

  function toggle(f: Feature) {
    const next = active.includes(f) ? active.filter(x => x !== f) : [...active, f];
    setActive(next);
    applyFeatures(next);
    localStorage.setItem('a11y_prefs', JSON.stringify(next));
  }

  function reset() {
    setActive([]);
    applyFeatures([]);
    localStorage.removeItem('a11y_prefs');
  }

  const on = (f: Feature) => active.includes(f);

  const FEATURES = [
    { id: 'big-text' as Feature, label: 'הגדלת טקסט', icon: 'A+' },
    { id: 'high-contrast' as Feature, label: 'ניגודיות גבוהה', icon: '◑' },
    { id: 'highlight-links' as Feature, label: 'הדגשת קישורים', icon: '🔗' },
    { id: 'readable-font' as Feature, label: 'גופן קריא', icon: 'Aa' },
    { id: 'stop-animations' as Feature, label: 'הפסקת אנימציות', icon: '⏸' },
  ];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="תפריט נגישות"
        aria-expanded={open}
        style={{
          position: 'fixed', bottom: 80, left: 20, zIndex: 9990,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--teal)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,229,204,.4)',
          fontSize: 22,
          color: '#000',
        }}
      >
        ♿
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="תפריט נגישות"
          style={{
            position: 'fixed', bottom: 140, left: 20, zIndex: 9990,
            width: 240,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,.5)',
            padding: 16,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>נגישות</span>
            <button onClick={() => setOpen(false)} aria-label="סגור" style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FEATURES.map(f => (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                aria-pressed={on(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  border: on(f.id) ? '1px solid var(--teal)' : '1px solid var(--border)',
                  background: on(f.id) ? 'rgba(0,229,204,.12)' : 'transparent',
                  color: on(f.id) ? 'var(--teal)' : 'var(--text2)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'right', width: '100%',
                }}
              >
                <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center', fontSize: 14 }}>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={reset}
            style={{
              marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text3)', cursor: 'pointer', fontSize: 12,
            }}
          >
            איפוס הגדרות
          </button>

          <Link
            href="/accessibility"
            style={{ display: 'block', marginTop: 8, textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}
          >
            הצהרת נגישות
          </Link>
        </div>
      )}
    </>
  );
}
