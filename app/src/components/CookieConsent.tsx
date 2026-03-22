'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_consent');
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="הסכמה לשימוש בעוגיות"
      style={{
        position: 'fixed', bottom: 24, right: 24, left: 24, zIndex: 9999,
        maxWidth: 560, margin: '0 auto',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,.5)',
        padding: '20px 24px',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
        אנו משתמשים בקובצי Cookie
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
        האתר משתמש בקובצי Cookie לצורך שיפור חוויית המשתמש, ניתוח תנועה ושמירת העדפות. המשך הגלישה מהווה הסכמה לשימוש. לפרטים ראה{' '}
        <Link href="/privacy" style={{ color: 'var(--teal)' }}>מדיניות פרטיות</Link>.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={decline}
          style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}
        >
          דחה
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--teal)', color: '#000', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
          }}
        >
          אני מסכים/ה
        </button>
      </div>
    </div>
  );
}
