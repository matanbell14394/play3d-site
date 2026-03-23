'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import AuthModal from "@/components/AuthModal";

export interface GalleryItem { id: string; title: string; description: string | null; imageUrl: string | null; images: string; }

function ContactForm() {
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async () => {
    if (!form.name || !form.contact || !form.message) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setStatus(res.ok ? 'sent' : 'error');
      if (res.ok) setForm({ name: '', contact: '', message: '' });
    } catch { setStatus('error'); }
  };

  if (status === 'sent') return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--teal)', borderRadius: 14, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal)' }}>הודעה נשלחה!</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>נחזור אליך בהקדם</div>
      <button onClick={() => setStatus('idle')} style={{ marginTop: 16, padding: '8px 20px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 7, color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>שלח הודעה נוספת</button>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
      <div className="fg" style={{ marginBottom: 11 }}><label>שם *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ישראל ישראלי" /></div>
      <div className="fg" style={{ marginBottom: 11 }}><label>אימייל / טלפון *</label><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="052-0000000" /></div>
      <div className="fg" style={{ marginBottom: 14 }}><label>הודעה *</label><textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ minHeight: 85 }} placeholder="כתוב לנו..." /></div>
      {status === 'error' && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>שגיאה בשליחה, נסה שוב</div>}
      <button onClick={submit} disabled={status === 'sending' || !form.name || !form.contact || !form.message} style={{ width: '100%', padding: 11, borderRadius: 9, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: 'var(--bg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', opacity: status === 'sending' ? .7 : 1 }}>
        {status === 'sending' ? 'שולח...' : 'שלח הודעה'}
      </button>
    </div>
  );
}

interface PrinterStatus { status: string; taskName: string | null; progress: number; modelImageUrl: string | null; modelTitle: string | null; updatedAt: string | null; }

export default function HomeClient({ initialGallery }: { initialGallery: GalleryItem[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [galleryItems] = useState<GalleryItem[]>(initialGallery);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);

  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (session) { router.push('/order'); } else { setShowAuth(true); }
  };

  useEffect(() => {
    fetch('/api/printer-status').then(r => r.json()).then(d => { if (d?.status) setPrinterStatus(d); });
    const interval = setInterval(() => {
      fetch('/api/printer-status').then(r => r.json()).then(d => { if (d?.status) setPrinterStatus(d); });
    }, 15000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      const item = galleryItems[lightbox];
      if (!item) return;
      let imgs: string[] = []; try { imgs = JSON.parse(item.images); } catch { imgs = []; }
      const all = [item.imageUrl, ...imgs].filter(Boolean);
      if (e.key === 'ArrowLeft') setImgIdx(i => (i + 1) % all.length);
      if (e.key === 'ArrowRight') setImgIdx(i => (i - 1 + all.length) % all.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, galleryItems]);

  const openLightbox = (idx: number) => { setLightbox(idx); setImgIdx(0); };

  return (
    <>
      <div className="grid-bg" />
      <SiteNav active="home" />

      {/* HERO */}
      <section id="main-content" className="hero">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div className="hero-tag">🖨️ &nbsp; הדפסות תלת מימד מקצועיות</div>
          <h1 className="hero-title">
            <span className="t">3D</span> — <span className="p">מחלום</span> למציאות
          </h1>
          <p className="hero-sub">
            ממודלים ועד אבות טיפוס תעשייתיים — אנו מממשים כל רעיון בחומרים איכותיים ודיוק מרשים.
          </p>
          <div className="hero-btns">
            <a href="#order" className="btn-hero" onClick={handleOrderClick}>הזמן הדפסה עכשיו</a>
            <Link href="/gallery" className="btn-ghost">לצפות בגלריה</Link>
          </div>
          <div className="hero-stats">
            <div className="hst"><div className="hst-v">500+</div><div className="hst-l">פרויקטים</div></div>
            <div className="hst"><div className="hst-v pk">24h</div><div className="hst-l">מענה מהיר</div></div>
            <div className="hst"><div className="hst-v">99%</div><div className="hst-l">שביעות רצון</div></div>
          </div>
        </div>
        <div className="scroll-hint">
          <div className="scroll-hint-icon"><div className="scroll-hint-dot" /></div>
          <div className="scroll-hint-txt">גלול</div>
        </div>
      </section>

      {/* LIVE PRINTER STATUS */}
      {printerStatus && printerStatus.status !== 'offline' && (
        <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: printerStatus.status === 'printing' ? '#10b981' : printerStatus.status === 'paused' ? '#f59e0b' : '#6b7280', boxShadow: printerStatus.status === 'printing' ? '0 0 8px #10b981' : 'none', animation: printerStatus.status === 'printing' ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: printerStatus.status === 'printing' ? '#10b981' : printerStatus.status === 'paused' ? '#f59e0b' : 'var(--text3)' }}>
                {printerStatus.status === 'printing' ? 'מדפיס עכשיו' : printerStatus.status === 'paused' ? 'מושהה' : 'בקרוב'}
              </span>
            </div>
            {printerStatus.modelImageUrl && (
              <img src={printerStatus.modelImageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {printerStatus.modelTitle || printerStatus.taskName || 'מודל לא ידוע'}
              </div>
              {printerStatus.taskName && printerStatus.modelTitle && (
                <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{printerStatus.taskName}</div>
              )}
            </div>
            {printerStatus.status === 'printing' && printerStatus.progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 120, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${printerStatus.progress}%`, background: 'linear-gradient(90deg,var(--teal),var(--teal2))', borderRadius: 3, transition: 'width .5s' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, minWidth: 32 }}>{printerStatus.progress}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SERVICES */}
      <section className="section alt" style={{ position: 'relative' }}>
        <div className="section-num">01</div>
        <div className="sh"><div className="sh-tag">// שירותים</div><h2 className="sh-title">מה אנחנו מציעים</h2><div className="sh-line" /></div>
        <div className="srv-grid">
          <div className="srv-card"><div className="srv-icon">🖨️</div><div className="srv-name">FDM PRINTING</div><p className="srv-desc">פילמנט PLA, PETG, ABS, TPU בגדלים מגוונים. מושלם לאבות טיפוס ומודלים.</p></div>
          <div className="srv-card"><div className="srv-icon">✏️</div><div className="srv-name">CUSTOM DESIGN</div><p className="srv-desc">אין לך קובץ STL? נעזור לך לתכנן מאפס או לשנות עיצוב קיים לפי הצרכים שלך.</p></div>
          <div className="srv-card"><div className="srv-icon">📦</div><div className="srv-name">BATCH ORDERS</div><p className="srv-desc">הזמנות כמות גדולה בהנחה. אידיאלי לאירועים, מתנות קורפורייט, ויזמים.</p></div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/materials" className="btn btn-t">← למידע על חומרי ההדפסה</Link>
        </div>
      </section>

      {/* GALLERY — SSR rendered, SEO friendly */}
      <section className="section" id="gallery" style={{ position: 'relative' }}>
        <div className="section-num">02</div>
        <div className="sh"><div className="sh-tag">// גלריה</div><h2 className="sh-title">עבודות אחרונות</h2><div className="sh-line" /></div>
        <div className="gal-grid">
          {galleryItems.length === 0 ? (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>עבודות בקרוב...</p>
          ) : galleryItems.map((item, idx) => (
            <div key={item.id} className="gal-card" onClick={() => openLightbox(idx)} style={{ cursor: 'pointer' }} role="button" aria-label={`פתח תמונה: ${item.title}`} tabIndex={0} onKeyDown={e => e.key === 'Enter' && openLightbox(idx)}>
              <div className="gal-thumb" style={{ background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, overflow: 'hidden' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.title} width={400} height={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  : '🖼️'}
              </div>
              <div className="gal-overlay">
                <div className="gal-t">{item.title}</div>
                {item.description && <div className="gal-s">{item.description}</div>}
                <div style={{ fontSize: 10, color: 'var(--teal)', marginTop: 4, opacity: 0.8 }}>לחץ לצפייה ▸</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="section alt" id="about" style={{ position: 'relative' }}>
        <div className="section-num">03</div>
        <div className="about-grid">
          <div>
            <div className="sh"><div className="sh-tag">// אודות</div><h2 className="sh-title">מי אנחנו?</h2><div className="sh-line" /></div>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.85, marginBottom: 20 }}>
              Play3D הוא סטודיו הדפסות תלת מימד שנוסד מתוך תשוקה לטכנולוגיה ועיצוב. אנו מאמינים שכל רעיון — קטן כגדול — ראוי להפוך למוחשי.
            </p>
            <ul className="about-list">
              <li>ציוד מקצועי ומדויק מהיצרנים המובילים</li>
              <li>מעל 500 פרויקטים מוצלחים ב-6 שנים</li>
              <li>הדפסה ביותר מ-20 סוגי חומרים</li>
              <li>תמיכה וייעוץ אישי בכל שלב</li>
            </ul>
          </div>
          <div className="about-visual">
            <div className="about-box">
              <div className="about-emoji">🖨️</div>
              <div className="about-year">SINCE 2019</div>
              <div className="about-big">3D</div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section" id="reviews" style={{ position: 'relative' }}>
        <div className="section-num">04</div>
        <div className="sh"><div className="sh-tag">// ביקורות</div><h2 className="sh-title">מה הלקוחות אומרים</h2><div className="sh-line" /></div>
        <div className="rev-grid">
          {[
            { text: 'קיבלתי מודל מדהים של האריה שביקשתי! איכות הדפסה מעולה, פרטים חדים ומסירה מהירה. ממליץ בחום!', name: 'אורי כהן', role: 'מעצב גרפי', initials: 'או' },
            { text: 'עבדתי עם Play3D על פרויקט אב טיפוס תעשייתי. הצוות מקצועי, מהיר ועמד בדיוק בדרישות שלי.', name: 'ליאת לוי', role: 'מהנדסת מוצר', initials: 'ל' },
            { text: 'הזמנתי 50 מוצרי מתנה לאירוע חברה. הכל הגיע בזמן, באריזה יפה וברמה גבוהה. תודה!', name: 'דני רוזן', role: 'מנהל שיווק', initials: 'ד' },
          ].map((rev) => (
            <div key={rev.name} className="rev-card">
              <div className="rev-stars">★★★★★</div>
              <p className="rev-text">{rev.text}</p>
              <div className="rev-author">
                <div className="rev-av">{rev.initials}</div>
                <div><div className="rev-name">{rev.name}</div><div className="rev-role">{rev.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ORDER CTA */}
      <section className="section alt" id="order" style={{ position: 'relative', textAlign: 'center' }}>
        <div className="section-num">05</div>
        <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 12 }}>// הזמנה</div>
        <h2 className="sh-title">מוכן להדפיס?</h2>
        <div className="sh-line" style={{ margin: '12px auto 20px' }} />
        <p style={{ color: 'var(--text2)', fontSize: 15, maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.8 }}>
          הגש הזמנה בקלות דרך האזור האישי — בחר חומר, העלה קובץ וקבל הצעת מחיר תוך 24 שעות.
        </p>
        <button onClick={handleOrderClick} className="btn-hero" style={{ fontSize: 16, padding: '14px 36px' }}>
          🚀 הזמן הדפסה עכשיו
        </button>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="sh"><div className="sh-tag">// צור קשר</div><h2 className="sh-title">בואו נדבר</h2><div className="sh-line" /></div>
        <div className="contact-grid">
          <div>
            <div className="cii"><div className="cii-icon">📞</div><div><div className="cii-lbl">טלפון / וואטסאפ</div><div className="cii-val">052-6018145</div></div></div>
            <div className="cii"><div className="cii-icon">✉️</div><div><div className="cii-lbl">אימייל</div><div className="cii-val">info@play3d.co.il</div></div></div>
            <div className="cii"><div className="cii-icon">📍</div><div><div className="cii-lbl">מיקום</div><div className="cii-val">טבעון, ישראל</div></div></div>
            <div className="cii"><div className="cii-icon">⏰</div><div><div className="cii-lbl">שעות פעילות</div><div className="cii-val">א׳–ה׳ 09:00–18:00</div></div></div>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-logo">PLAY3D</div>
            <p className="footer-desc">סטודיו הדפסות תלת מימד. ממודלים ועד חלקים תעשייתיים — אנחנו כאן.</p>
          </div>
          <div>
            <div className="footer-col-title">ניווט</div>
            <a href="#gallery" className="footer-link">גלריה</a>
            <Link href="/materials" className="footer-link">חומרים</Link>
            <a href="#about" className="footer-link">אודות</a>
            <a href="#contact" className="footer-link">צור קשר</a>
          </div>
          <div>
            <div className="footer-col-title">חומרים</div>
            <Link href="/materials" className="footer-link">PLA</Link>
            <Link href="/materials" className="footer-link">PETG</Link>
            <Link href="/materials" className="footer-link">ABS</Link>
            <Link href="/materials" className="footer-link">TPU</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 PLAY3D. כל הזכויות שמורות.</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 'auto' }}>
            <Link href="/accessibility" style={{ color: 'var(--text3)', marginLeft: 12 }}>נגישות</Link>
            <Link href="/privacy" style={{ color: 'var(--text3)' }}>פרטיות</Link>
          </span>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} redirectTo="/order" />}

      {/* LIGHTBOX */}
      {lightbox !== null && galleryItems[lightbox] && (() => {
        const item = galleryItems[lightbox];
        let imgs: string[] = []; try { imgs = JSON.parse(item.images); } catch { imgs = []; }
        const all = [item.imageUrl, ...imgs].filter(Boolean) as string[];
        const cur = all[imgIdx] || all[0];
        return (
          <div role="dialog" aria-modal="true" aria-label={item.title} onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                  {all.map((u, i) => (
                    <img key={i} src={u} alt={`${item.title} תמונה ${i + 1}`} onClick={() => setImgIdx(i)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: `2px solid ${i === imgIdx ? 'var(--teal)' : 'rgba(255,255,255,.2)'}`, cursor: 'pointer', transition: 'border-color .2s' }} />
                  ))}
                </div>
              )}
              <a href="#order" onClick={() => setLightbox(null)} className="btn-hero" style={{ display: 'inline-block', fontSize: 13, padding: '9px 22px' }}>הזמן הדפסה דומה</a>
            </div>
          </div>
        );
      })()}
    </>
  );
}
