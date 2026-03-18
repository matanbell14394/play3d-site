'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/gallery');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description || '', imageUrl: item.imageUrl || '' });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setForm(emptyForm); };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setForm(f => ({ ...f, imageUrl: data.url }));
    } finally {
      setUploading(false);
    }
  };

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
      <div className="ph">
        <div>
          <div className="ptitle"><span>▦</span> גלריה</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm" onClick={openAdd}>+ פרויקט חדש</button>
      </div>

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
                <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
              ) : (
                <div style={{ width: '100%', height: 180, borderRadius: 10, background: 'var(--bg2)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 32 }}>🖼️</div>
              )}
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>{item.description}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '7px 0', background: 'var(--teal3)', border: '1px solid var(--teal)', color: 'var(--teal)', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>✏️ עריכה</button>
                <button onClick={() => remove(item.id)} disabled={deleting === item.id} style={{ flex: 1, padding: '7px 0', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', color: '#ef4444', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                  {deleting === item.id ? '...' : '🗑️ מחק'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
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
              placeholder="תיאור קצר..."
              rows={2}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
            />

            {/* Image upload */}
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>תמונה</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--border2)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 10, transition: 'border-color .2s' }}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
            >
              {uploading ? (
                <div style={{ color: 'var(--teal)', fontSize: 14 }}>מעלה...</div>
              ) : form.imageUrl ? (
                <img src={form.imageUrl} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>לחץ להעלאה או גרור תמונה לכאן</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG, WEBP</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>או הדבק קישור</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 18, boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>ביטול</button>
              <button onClick={save} disabled={saving || uploading || !form.title.trim()} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, var(--teal), var(--teal2))', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving || uploading || !form.title.trim() ? .6 : 1 }}>
                {saving ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף לגלריה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
