'use client';

import { useEffect, useState } from 'react';

interface Entry { id: number; name: string; score: number; createdAt: string; }

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/leaderboard/all');
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number, name: string) => {
    if (!confirm(`למחוק את ${name}?`)) return;
    await fetch(`/api/leaderboard/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>🏆</span> לידרבורד — Filament Feed</div>
          <div className="pline" />
        </div>
      </div>

      <div className="sg" style={{ marginBottom: 20 }}>
        <div className="sc"><div className="slbl">סה&quot;כ רשומות</div><div className="sval">{entries.length}</div></div>
        <div className="sc pk"><div className="slbl">תוצאה גבוהה</div><div className="sval">{entries[0]?.score ?? '—'}</div></div>
        <div className="sc"><div className="slbl">שחקנים ייחודיים</div><div className="sval">{new Set(entries.map(e => e.name)).size}</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>שם</th><th>ציון</th><th>תאריך</th><th>פעולות</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>טוען...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>אין רשומות</td></tr>
            ) : entries.map((e, i) => (
              <tr key={e.id}>
                <td style={{ color: 'var(--text3)', fontSize: 13 }}>{i + 1}</td>
                <td><strong>{e.name}</strong></td>
                <td>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(0,229,204,.15)', color: 'var(--teal)' }}>
                    {e.score}
                  </span>
                </td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString('he-IL')}</td>
                <td>
                  <button className="btn btn-d btn-sm" onClick={() => remove(e.id, e.name)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
