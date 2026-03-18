'use client';

import { useEffect, useState } from 'react';

interface Msg { id: string; name: string; contact: string; message: string; read: boolean; createdAt: string; }

export default function ContactsPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/contact');
    const data = await res.json();
    setMsgs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await fetch('/api/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMsgs(m => m.map(x => x.id === id ? { ...x, read: true } : x));
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק פנייה זו?')) return;
    await fetch('/api/contact', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMsgs(m => m.filter(x => x.id !== id));
  };

  const unread = msgs.filter(m => !m.read).length;

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle">
            <span>✉️</span> פניות לקוחות
            {unread > 0 && <span style={{ background: 'var(--teal)', color: '#000', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '2px 8px', marginRight: 8 }}>{unread} חדש</span>}
          </div>
          <div className="pline" />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48 }}>טוען...</div>
      ) : msgs.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>אין פניות עדיין</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map(msg => (
            <div key={msg.id} style={{ background: 'var(--bg2)', border: `1px solid ${msg.read ? 'var(--border)' : 'var(--teal)'}`, borderRadius: 12, padding: '16px 20px', position: 'relative', opacity: msg.read ? 0.75 : 1 }}>
              {!msg.read && <div style={{ position: 'absolute', top: 14, right: 16, width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{msg.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--teal)', marginTop: 2 }}>{msg.contact}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(msg.createdAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {!msg.read && (
                  <button onClick={() => markRead(msg.id)} style={{ padding: '6px 14px', background: 'var(--teal3)', border: '1px solid var(--teal)', color: 'var(--teal)', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>✓ סמן כנקרא</button>
                )}
                <button onClick={() => remove(msg.id)} style={{ padding: '6px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', color: '#ef4444', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>🗑️ מחק</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
