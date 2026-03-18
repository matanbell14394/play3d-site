'use client';

import { useEffect, useState } from 'react';

interface User { id: string; name: string | null; email: string; role: string; createdAt: string; }

const ROLES = ['CLIENT', 'OPERATOR', 'ADMIN'];
const emptyForm = { name: '', email: '', password: '', role: 'CLIENT' };

const roleBadge: Record<string, { bg: string; color: string }> = {
  ADMIN:    { bg: 'rgba(236,72,153,.15)', color: '#ec4899' },
  OPERATOR: { bg: 'rgba(0,229,204,.15)',  color: 'var(--teal)' },
  CLIENT:   { bg: 'rgba(255,255,255,.07)', color: 'var(--text2)' },
};
const roleLabel: Record<string, string> = { ADMIN: 'אדמין', OPERATOR: 'מפעיל', CLIENT: 'לקוח' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setModal(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name || '', email: u.email, password: '', role: u.role }); setError(''); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); };

  const save = async () => {
    if (!form.email) return;
    if (!editing && !form.password) { setError('סיסמה חובה'); return; }
    setSaving(true); setError('');
    try {
      const res = editing
        ? await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.status === 409) { setError('אימייל כבר קיים במערכת'); return; }
      if (!res.ok) { setError('שגיאה בשמירה'); return; }
      await load(); closeModal();
    } finally { setSaving(false); }
  };

  const remove = async (id: string, email: string) => {
    if (!confirm(`למחוק את ${email}?`)) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    load();
  };

  const admins = users.filter(u => u.role === 'ADMIN').length;

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>👥</span> משתמשים</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm" onClick={openAdd}>+ משתמש חדש</button>
      </div>

      <div className="sg" style={{ marginBottom: 20 }}>
        <div className="sc"><div className="slbl">סה&quot;כ משתמשים</div><div className="sval">{users.length}</div></div>
        <div className="sc pk"><div className="slbl">אדמינים</div><div className="sval">{admins}</div></div>
        <div className="sc"><div className="slbl">לקוחות</div><div className="sval">{users.filter(u => u.role === 'CLIENT').length}</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>שם</th><th>אימייל</th><th>תפקיד</th><th>נוצר</th><th>פעולות</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>טוען...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>אין משתמשים</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name || '—'}</strong></td>
                <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                <td>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: roleBadge[u.role]?.bg, color: roleBadge[u.role]?.color }}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('he-IL')}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-t btn-sm" onClick={() => openEdit(u)}>✏️</button>
                  <button className="btn btn-d btn-sm" onClick={() => remove(u.id, u.email)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 16, fontWeight: 700, color: 'var(--teal)', marginBottom: 20 }}>
              {editing ? '✏️ עריכת משתמש' : '+ משתמש חדש'}
            </div>

            {[
              { label: 'שם', key: 'name', type: 'text', placeholder: 'ישראל ישראלי' },
              { label: 'אימייל *', key: 'email', type: 'email', placeholder: 'user@example.com' },
              { label: editing ? 'סיסמה חדשה (השאר ריק לשמור)' : 'סיסמה *', key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  type={f.type} placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>תפקיד</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'inherit' }}>
                {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>ביטול</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? .7 : 1 }}>
                {saving ? 'שומר...' : editing ? 'שמור שינויים' : 'צור משתמש'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
