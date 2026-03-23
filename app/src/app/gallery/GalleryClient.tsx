'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Item { id: string; title: string; description: string | null; imageUrl: string | null; images: string; category: string; }

export default function GalleryClient({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState('הכל');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  const categories = ['הכל', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];
  const filtered = filter === 'הכל' ? items : items.filter(i => i.category === filter);

  const openLightbox = (idx: number) => { setLightbox(idx); setImgIdx(0); };

  const getImgs = (item: Item) => {
    let extra: string[] = []; try { extra = JSON.parse(item.images); } catch {}
    return [item.imageUrl, ...extra].filter(Boolean) as string[];
  };

  return (
    <main id="main-content" style={{ direction: 'rtl', paddingTop: 80 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 24px 40px' }}>
        <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 12 }}>// גלריה</div>
        <h1 className="sh-title">עבודות שלנו</h1>
        <div className="sh-line" style={{ margin: '12px auto 20px' }} />
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          {items.length} פרויקטים — ממודלים ועד חלקים תעשייתיים
        </p>
      </div>

      {/* Filters */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', padding: '0 24px 32px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '8px 20px', borderRadius: 20, border: `1px solid ${filter === cat ? 'var(--teal)' : 'var(--border)'}`,
                background: filter === cat ? 'var(--teal3)' : 'transparent',
                color: filter === cat ? 'var(--teal)' : 'var(--text2)',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: filter === cat ? 700 : 400,
                transition: 'all .2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)' }}>אין פרויקטים בקטגוריה זו עדיין</div>
        ) : (
          <div className="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {filtered.map((item, idx) => {
              const imgs = getImgs(item);
              return (
                <div
                  key={item.id} className="gal-card"
                  onClick={() => openLightbox(idx)}
                  role="button" tabIndex={0} aria-label={`פתח: ${item.title}`}
                  onKeyDown={e => e.key === 'Enter' && openLightbox(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="gal-thumb" style={{ background: 'var(--bg3)', overflow: 'hidden' }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <span style={{ fontSize: 56 }}>🖼️</span>}
                  </div>
                  <div className="gal-overlay">
                    {item.category && <div style={{ fontSize: 10, color: 'var(--teal)', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{item.category}</div>}
                    <div className="gal-t">{item.title}</div>
                    {item.description && <div className="gal-s">{item.description}</div>}
                    {imgs.length > 1 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{imgs.length} תמונות</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/order" className="btn-hero" style={{ display: 'inline-block', fontSize: 14 }}>הזמן הדפסה דומה</Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (() => {
        const item = filtered[lightbox];
        const all = getImgs(item);
        const cur = all[imgIdx] || all[0];
        return (
          <div role="dialog" aria-modal="true" aria-label={item.title} onClick={() => setLightbox(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setLightbox(null)} aria-label="סגור" style={{ position: 'fixed', top: 18, left: 18, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 16, padding: '6px 14px', zIndex: 2001 }}>✕</button>
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cur && <img src={cur} alt={item.title} style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 12 }} />}
              {all.length > 1 && <>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + all.length) % all.length); }} aria-label="קודם" style={{ position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 24, padding: '12px 16px', borderRadius: 8, cursor: 'pointer' }}>‹</button>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % all.length); }} aria-label="הבא" style={{ position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 24, padding: '12px 16px', borderRadius: 8, cursor: 'pointer' }}>›</button>
              </>}
            </div>
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{item.title}</div>
              {item.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>{item.description}</p>}
              {all.length > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                  {all.map((u, i) => <img key={i} src={u} alt="" onClick={() => setImgIdx(i)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: `2px solid ${i === imgIdx ? 'var(--teal)' : 'rgba(255,255,255,.2)'}`, cursor: 'pointer' }} />)}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
