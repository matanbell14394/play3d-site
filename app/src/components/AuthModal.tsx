'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Props {
  onClose: () => void;
  redirectTo?: string;
}

export default function AuthModal({ onClose, redirectTo = '/order' }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCredentials = async () => {
    setLoading(true); setError('');
    if (tab === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) { setError('שגיאה בהרשמה — אולי כבר קיים חשבון'); setLoading(false); return; }
    }
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError('אימייל או סיסמה שגויים'); return; }
    onClose();
    router.push(redirectTo);
  };

  const handleOAuth = async (provider: string) => {
    await signIn(provider, { callbackUrl: redirectTo });
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="התחברות"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 420, direction: 'rtl', position: 'relative' }}>
        <button onClick={onClose} aria-label="סגור" style={{ position: 'absolute', top: 14, left: 14, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>✕</button>

        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>
          {tab === 'login' ? 'ברוך הבא בחזרה' : 'הצטרף ל-PLAY3D'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 24 }}>
          {tab === 'login' ? 'התחבר כדי להגיש הזמנה' : 'צור חשבון חינם'}
        </p>

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <button onClick={() => handleOAuth('google')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600, transition: 'border-color .2s' }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            המשך עם Google
          </button>
          <button onClick={() => handleOAuth('facebook')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', background: '#1877F2', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            המשך עם Facebook
          </button>
          <button onClick={() => handleOAuth('twitter')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', background: '#000', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 }}>
            <svg width="16" height="16" fill="white" viewBox="0 0 300 300"><path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300h26.46l102.4-116.59L209.66 300H300L178.57 127.15Zm-36.21 41.26-11.88-16.61L36.51 19.59h40.65l76.21 106.49 11.88 16.61 99.06 138.51h-40.65l-80.35-113.79Z"/></svg>
            המשך עם X (Twitter)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }} style={{ flex: 1, padding: '9px 0', border: 'none', background: tab === t ? 'var(--teal3)' : 'transparent', color: tab === t ? 'var(--teal)' : 'var(--text3)', fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              {t === 'login' ? 'כניסה' : 'הרשמה'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <div className="fg">
              <label htmlFor="auth-name">שם מלא</label>
              <input id="auth-name" value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" />
            </div>
          )}
          <div className="fg">
            <label htmlFor="auth-email">אימייל</label>
            <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="fg">
            <label htmlFor="auth-password">סיסמה</label>
            <input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleCredentials()} />
          </div>
        </div>

        {error && <div style={{ marginTop: 10, color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <button
          onClick={handleCredentials}
          disabled={loading || !email || !password}
          style={{ marginTop: 18, width: '100%', padding: '12px 0', borderRadius: 10, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !email || !password ? .6 : 1 }}
        >
          {loading ? 'מתחבר...' : tab === 'login' ? 'כניסה' : 'יצירת חשבון'}
        </button>
      </div>
    </div>
  );
}
