'use client';
import { useEffect, useState } from 'react';

interface Post { id: string; title: string; slug: string; excerpt: string | null; published: boolean; createdAt: string; }

const emptyForm = { title: '', slug: '', excerpt: '', content: '', published: false, coverImage: '' };

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/blog?all=1').then(r => r.json()).then(d => { if (Array.isArray(d)) setPosts(d); });
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof emptyForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const titleToSlug = (t: string) => t.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 60);

  const save = async () => {
    setSaving(true);
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/blog/${editing}` : '/api/blog';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    load();
  };

  const del = async (slug: string) => {
    if (!confirm('למחוק?')) return;
    await fetch(`/api/blog/${slug}`, { method: 'DELETE' });
    load();
  };

  const edit = (p: Post & { content?: string }) => {
    fetch(`/api/blog/${p.slug}`).then(r => r.json()).then(full => {
      setForm({ title: full.title, slug: full.slug, excerpt: full.excerpt || '', content: full.content, published: full.published, coverImage: full.coverImage || '' });
      setEditing(p.slug);
      setShowForm(true);
    });
  };

  return (
    <div className="admin-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="ptitle">✍️ בלוג</h1>
        <button className="btn btn-t" onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}>+ פוסט חדש</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editing ? 'עריכת פוסט' : 'פוסט חדש'}</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="fg">
              <label htmlFor="blog-title">כותרת *</label>
              <input id="blog-title" value={form.title} onChange={e => { set('title', e.target.value); if (!editing) set('slug', titleToSlug(e.target.value)); }} placeholder="כותרת הפוסט" />
            </div>
            <div className="fg">
              <label htmlFor="blog-slug">Slug (כתובת)</label>
              <input id="blog-slug" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="post-url-slug" style={{ direction: 'ltr' }} />
            </div>
            <div className="fg">
              <label htmlFor="blog-excerpt">תקציר</label>
              <input id="blog-excerpt" value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="משפט קצר שיוצג בדף הבלוג" />
            </div>
            <div className="fg">
              <label htmlFor="blog-cover">תמונת שער (URL)</label>
              <input id="blog-cover" value={form.coverImage} onChange={e => set('coverImage', e.target.value)} placeholder="https://..." style={{ direction: 'ltr' }} />
            </div>
            <div className="fg">
              <label htmlFor="blog-content">תוכן (HTML) *</label>
              <textarea id="blog-content" value={form.content} onChange={e => set('content', e.target.value)} style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }} placeholder="<p>תוכן הפוסט...</p>" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} />
              פורסם (גלוי לציבור)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={save} disabled={saving || !form.title || !form.slug || !form.content} className="btn btn-t">
              {saving ? 'שומר...' : editing ? 'שמור שינויים' : 'פרסם פוסט'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-g">ביטול</button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="tbl">
          <thead><tr><th>כותרת</th><th>Slug</th><th>סטטוס</th><th>תאריך</th><th>פעולות</th></tr></thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>אין פוסטים עדיין</td></tr>
            ) : posts.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.title}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, direction: 'ltr' }}>{p.slug}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.published ? 'rgba(16,185,129,.15)' : 'rgba(107,114,128,.15)', color: p.published ? '#10b981' : 'var(--text3)' }}>{p.published ? 'פורסם' : 'טיוטה'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(p.createdAt).toLocaleDateString('he-IL')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => edit(p)} className="btn btn-g btn-sm">✏️</button>
                    <button onClick={() => del(p.slug)} className="btn btn-danger btn-sm">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
