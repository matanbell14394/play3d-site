'use client';

import { useEffect, useState } from 'react';

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

const emptyForm = { title: '', description: '', imageUrl: '' };

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/gallery');
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', imageUrl: item.imageUrl || '' });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); setForm(emptyForm); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/gallery/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      await load();
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק פרויקט זה?')) return;
    setDeleting(id);
    await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
    await load();
    setDeleting(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="ph">
        <div>
          <div className="ptitle"><span>▦</span> גלריה</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm" onClick={openAdd}>+ פרויקט חדש</button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48 }}>טוען...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>
          אין פרויקטים עדיין — לחץ על &quot;+ פרויקט חדש&quot;
        </div>
      ) : (
        <div className="gal-grid2">
          {items.map((item) => (
            <div key={item.id} className="gal-card" style={{ position: 'relative' }}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                />
              ) : (
                <div style={{ width: '100%', height: 180, borderRadius: 10, background: 'var(--bg2)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 32 }}>
                  🖼️
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
              {item.description && (
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>{item.description}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openEdit(item)}
                  style={{ flex: 1, padding: '7px 0', background: 'var(--teal3)', border: '1px solid var(--teal)', color: 'var(--teal)', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}
                >
                  ✏️ עריכה
                </button>
                <button
                  onClick={() => remove(item.id)}
                  disabled={deleting === item.id}
                  style={{ flex: 1, padding: '7px 0', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', color: '#ef4444', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}
                >
                  {deleting === item.id ? '...' : '🗑️ מחק'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--teal)' }}>
              {editing ? '✏️ עריכת פרויקט' : '+ פרויקט חדש'}
            </div>

            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>שם הפרויקט *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="פיגורינה / מארז / קישוט..."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>תיאור (אופציונלי)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="תיאור קצר של הפרויקט..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />

            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>קישור לתמונה (URL)</label>
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 6, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 14 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={closeModal}
                style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                ביטול
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title.trim()}
                style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, var(--teal), var(--teal2))', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving || !form.title.trim() ? .6 : 1 }}
              >
                {saving ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף לגלריה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
