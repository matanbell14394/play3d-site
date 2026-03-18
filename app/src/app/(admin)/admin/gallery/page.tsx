'use client';

import { useEffect, useRef, useState } from 'react';

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  images: string; // JSON string
  createdAt: string;
}

const emptyForm = { title: '', description: '', imageUrl: '', images: [] as string[] };

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null); // slot index or -1 for main
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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
    let imgs: string[] = [];
    try { imgs = JSON.parse(item.images); } catch { imgs = []; }
    setForm({ title: item.title, description: item.description || '', imageUrl: item.imageUrl || '', images: imgs });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditing(null); setForm(emptyForm); };

  const uploadFile = async (file: File, slot: number) => {
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.url) return;
      if (slot === -1) {
        setForm(f => ({ ...f, imageUrl: data.url }));
      } else {
        setForm(f => {
          const imgs = [...f.images];
          imgs[slot] = data.url;
          return { ...f, images: imgs };
        });
      }
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (slot: number) => {
    if (slot === -1) { setForm(f => ({ ...f, imageUrl: '' })); return; }
    setForm(f => { const imgs = [...f.images]; imgs[slot] = ''; return { ...f, images: imgs }; });
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = { title: form.title, description: form.description, imageUrl: form.imageUrl, images: form.images.filter(Boolean) };
      if (editing) {
        await fetch(`/api/gallery/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      await load();
      closeModal();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק פרויקט זה?')) return;
    setDeleting(id);
    await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
    await load();
    setDeleting(null);
  };

  const UploadSlot = ({ slot, url, label }: { slot: number; url: string; label: string }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div
        onClick={() => fileRefs[slot + 1]?.current?.click()}
        style={{ height: 90, border: '2px dashed var(--border2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, slot); }}
        onDragOver={e => e.preventDefault()}
      >
        {uploading === slot ? (
          <span style={{ fontSize: 12, color: 'var(--teal)' }}>מעלה...</span>
        ) : url ? (
          <>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button onClick={e => { e.stopPropagation(); removeImage(slot); }} style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,.7)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}>✕</button>
          </>
        ) : (
          <span style={{ fontSize: 22 }}>📷</span>
        )}
      </div>
      <input ref={fileRefs[slot + 1]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, slot); }} />
    </div>
  );

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
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>אין פרויקטים — לחץ על &quot;+ פרויקט חדש&quot;</div>
      ) : (
        <div className="gal-grid2">
          {items.map((item) => {
            let imgs: string[] = [];
            try { imgs = JSON.parse(item.images); } catch { imgs = []; }
            const allImgs = [item.imageUrl, ...imgs].filter(Boolean) as string[];
            return (
              <div key={item.id} className="gal-card">
                {allImgs[0] ? (
                  <img src={allImgs[0]} alt={item.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <div style={{ width: '100%', height: 160, borderRadius: 8, background: 'var(--bg2)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, fontSize: 28 }}>🖼️</div>
                )}
                {allImgs.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {allImgs.slice(1).map((u, i) => (
                      <img key={i} src={u} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>{allImgs.length} תמונות</span>
                  </div>
                )}
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                {item.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>{item.description}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '7px 0', background: 'var(--teal3)', border: '1px solid var(--teal)', color: 'var(--teal)', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>✏️ עריכה</button>
                  <button onClick={() => remove(item.id)} disabled={deleting === item.id} style={{ flex: 1, padding: '7px 0', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', color: '#ef4444', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
                    {deleting === item.id ? '...' : '🗑️ מחק'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--teal)' }}>
              {editing ? '✏️ עריכת פרויקט' : '+ פרויקט חדש'}
            </div>

            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>שם הפרויקט *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="שם הפרויקט..." style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />

            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>תיאור</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="תיאור קצר..." style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />

            {/* Main image */}
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>תמונה ראשית</label>
            <div
              onClick={() => fileRefs[0].current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f, -1); }}
              onDragOver={e => e.preventDefault()}
              style={{ border: '2px dashed var(--border2)', borderRadius: 10, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: 12, position: 'relative', background: 'var(--bg)' }}
            >
              {uploading === -1 ? <span style={{ color: 'var(--teal)', fontSize: 13 }}>מעלה...</span>
                : form.imageUrl ? (
                  <>
                    <img src={form.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={e => { e.stopPropagation(); removeImage(-1); }} style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>✕ הסר</button>
                  </>
                ) : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28 }}>📁</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>לחץ או גרור תמונה</div></div>}
            </div>
            <input ref={fileRefs[0]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, -1); }} />

            {/* Extra images */}
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>תמונות נוספות (עד 3)</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[0, 1, 2].map(i => (
                <UploadSlot key={i} slot={i} url={form.images[i] || ''} label={`תמונה ${i + 2}`} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>ביטול</button>
              <button onClick={save} disabled={saving || uploading !== null || !form.title.trim()} style={{ flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, var(--teal), var(--teal2))', border: 'none', color: '#000', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving || uploading !== null || !form.title.trim() ? .6 : 1 }}>
                {saving ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף לגלריה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
