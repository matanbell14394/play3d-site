'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

interface GalleryItem { id: string; title: string; description: string | null; imageUrl: string | null; images: string; }

export default function HomePage() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetch('/api/gallery').then(r => r.json()).then(d => { if (Array.isArray(d)) setGalleryItems(d); });
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

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">PLAY3D</div>
        <div className="nav-links">
          <Link href="/" className="nl active">בית</Link>
          <Link href="/materials" className="nl">חומרים</Link>
          <a href="#gallery" className="nl">גלריה</a>
          <a href="#reviews" className="nl">ביקורות</a>
          <a href="#about" className="nl">אודות</a>
          <a href="#contact" className="nl">צור קשר</a>
          <Link href="/login" className="nl special">אזור לקוח</Link>
          <Link href="/admin/dashboard" className="nl cta">ניהול</Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div className="hero-tag">🖨️ &nbsp; הדפסות תלת מימד מקצועיות</div>
          <h1 className="hero-title">
            <span className="t">3D</span> — <span className="p">מהחלום</span> למציאות
          </h1>
          <p className="hero-sub">
            מפיגורינות ועד אבות טיפוס תעשייתיים — אנו מממשים כל רעיון בחומרים איכותיים ודיוק מרשים.
          </p>
          <div className="hero-btns">
            <a href="#order" className="btn-hero">הזמן הדפסה עכשיו</a>
            <a href="#gallery" className="btn-ghost">לצפות בגלריה</a>
          </div>
          <div className="hero-stats">
            <div className="hst">
              <div className="hst-v">500+</div>
              <div className="hst-l">פרויקטים</div>
            </div>
            <div className="hst">
              <div className="hst-v pk">24h</div>
              <div className="hst-l">מענה מהיר</div>
            </div>
            <div className="hst">
              <div className="hst-v">99%</div>
              <div className="hst-l">שביעות רצון</div>
            </div>
          </div>
        </div>
        <div className="scroll-hint">
          <div className="scroll-hint-icon"><div className="scroll-hint-dot" /></div>
          <div className="scroll-hint-txt">גלול</div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section alt" style={{ position: 'relative' }}>
        <div className="section-num">01</div>
        <div className="sh">
          <div className="sh-tag">// שירותים</div>
          <h2 className="sh-title">מה אנחנו מציעים</h2>
          <div className="sh-line" />
        </div>
        <div className="srv-grid">
          <div className="srv-card">
            <div className="srv-icon">🖨️</div>
            <div className="srv-name">FDM PRINTING</div>
            <p className="srv-desc">פילמנט PLA, PETG, ABS, TPU בגדלים מגוונים. מושלם לאבות טיפוס ופיגורינות.</p>
          </div>
          <div className="srv-card">
            <div className="srv-icon">✏️</div>
            <div className="srv-name">CUSTOM DESIGN</div>
            <p className="srv-desc">אין לך קובץ STL? נעזור לך לתכנן מאפס או לשנות עיצוב קיים לפי הצרכים שלך.</p>
          </div>
          <div className="srv-card">
            <div className="srv-icon">📦</div>
            <div className="srv-name">BATCH ORDERS</div>
            <p className="srv-desc">הזמנות כמות גדולה בהנחה. אידיאלי לאירועים, מתנות קורפורייט, ויזמים.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/materials" className="btn btn-t">← למידע על חומרי ההדפסה</Link>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section" id="gallery" style={{ position: 'relative' }}>
        <div className="section-num">02</div>
        <div className="sh">
          <div className="sh-tag">// גלריה</div>
          <h2 className="sh-title">עבודות אחרונות</h2>
          <div className="sh-line" />
        </div>
        <div className="gal-grid">
          {galleryItems.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 48, fontSize: 14 }}>
              עבודות בקרוב...
            </div>
          ) : galleryItems.map((item, idx) => (
            <div key={item.id} className="gal-card" onClick={() => openLightbox(idx)} style={{ cursor: 'pointer' }}>
              <div className="gal-thumb" style={{ background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, overflow: 'hidden' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <div className="sh">
              <div className="sh-tag">// אודות</div>
              <h2 className="sh-title">מי אנחנו?</h2>
              <div className="sh-line" />
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.85, marginBottom: 20 }}>
              Play3D הוא סטודיו הדפסות תלת מימד שנוסד מתוך תשוקה לטכנולוגיה ועיצוב. אנו מאמינים שכל רעיון — קטן כגדול — ראוי להפוך למוחשי.
            </p>
            <ul className="about-list">
              <li>ציוד מקצועי ומדויק מהיצרנים המובילים</li>
              <li>מעל 500 פרויקטים מוצלחים ב-3 שנים</li>
              <li>הדפסה ביותר מ-20 סוגי חומרים</li>
              <li>מסירה תוך 24–72 שעות</li>
              <li>תמיכה וייעוץ אישי בכל שלב</li>
            </ul>
          </div>
          <div className="about-visual">
            <div className="about-box">
              <div className="about-emoji">🖨️</div>
              <div className="about-year">SINCE 2022</div>
              <div className="about-big">3D</div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section" id="reviews" style={{ position: 'relative' }}>
        <div className="section-num">04</div>
        <div className="sh">
          <div className="sh-tag">// ביקורות</div>
          <h2 className="sh-title">מה הלקוחות אומרים</h2>
          <div className="sh-line" />
        </div>
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
                <div>
                  <div className="rev-name">{rev.name}</div>
                  <div className="rev-role">{rev.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ORDER FORM */}
      <section className="section alt" id="order" style={{ position: 'relative' }}>
        <div className="section-num">05</div>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 6px' }}>
          <div className="sh-tag" style={{ textAlign: 'center' }}>// הזמנה</div>
          <h2 className="sh-title" style={{ textAlign: 'center' }}>הזמן הדפסה + הצטרף</h2>
          <div className="sh-line" style={{ margin: '10px auto 0' }} />
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>
            מלא את הפרטים — נחזור אליך תוך 24 שעות.
          </p>
        </div>
        <div className="order-wrap">
          <div className="form-grid">
            <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--teal)', letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 4, borderBottom: '1px solid rgba(0,229,204,.1)' }}>
              פרטי הרשמה
            </div>
            <div className="fg"><label>שם מלא *</label><input placeholder="ישראל ישראלי" /></div>
            <div className="fg"><label>אימייל *</label><input type="email" placeholder="your@email.com" /></div>
            <div className="fg"><label>טלפון *</label><input placeholder="050-0000000" /></div>
            <div className="fg"><label>עיר / ישוב</label><input placeholder="תל אביב" /></div>
            <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--teal)', letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 4, borderBottom: '1px solid rgba(0,229,204,.1)', marginTop: 6 }}>
              פרטי ההזמנה
            </div>
            <div className="fg">
              <label>סוג הדפסה</label>
              <select>
                <option value="">— בחר סוג —</option>
                <option>FDM — PLA</option>
                <option>FDM — PETG</option>
                <option>FDM — ABS</option>
                <option>FDM — TPU</option>
                <option>לא בטוח — ייעץ לי</option>
              </select>
            </div>
            <div className="fg"><label>כמות</label><input type="number" defaultValue={1} min={1} /></div>
            <div className="fg"><label>קובץ STL</label><input type="file" accept=".stl,.obj,.3mf" style={{ padding: '8px 12px' }} /></div>
            <div className="fg full"><label>תיאור הפרויקט</label><textarea placeholder="גודל, צבע, שימוש, רמת פינוי..." /></div>
            <Link href="/order" className="submit-btn-big" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>🚀 שלח הזמנה + הצטרף</Link>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="sh">
          <div className="sh-tag">// צור קשר</div>
          <h2 className="sh-title">בואו נדבר</h2>
          <div className="sh-line" />
        </div>
        <div className="contact-grid">
          <div>
            <div className="cii">
              <div className="cii-icon">📞</div>
              <div><div className="cii-lbl">טלפון / וואטסאפ</div><div className="cii-val">052-6018145</div></div>
            </div>
            <div className="cii">
              <div className="cii-icon">✉️</div>
              <div><div className="cii-lbl">אימייל</div><div className="cii-val">info@play3d.co.il</div></div>
            </div>
            <div className="cii">
              <div className="cii-icon">📍</div>
              <div><div className="cii-lbl">מיקום</div><div className="cii-val">טבעון, ישראל</div></div>
            </div>
            <div className="cii">
              <div className="cii-icon">⏰</div>
              <div><div className="cii-lbl">שעות פעילות</div><div className="cii-val">א׳–ה׳ 09:00–18:00</div></div>
            </div>
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div className="fg" style={{ marginBottom: 11 }}><label>שם</label><input placeholder="ישראל ישראלי" /></div>
            <div className="fg" style={{ marginBottom: 11 }}><label>אימייל / טלפון</label><input placeholder="050-0000000" /></div>
            <div className="fg" style={{ marginBottom: 14 }}><label>הודעה</label><textarea style={{ minHeight: 85 }} placeholder="כתוב לנו..." /></div>
            <button style={{ width: '100%', padding: 11, borderRadius: 9, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: 'var(--bg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}>
              שלח הודעה
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-logo">PLAY3D</div>
            <p className="footer-desc">סטודיו הדפסות תלת מימד. מפיגורינות ועד חלקים תעשייתיים — אנחנו כאן.</p>
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
        </div>
      </footer>
      {/* LIGHTBOX - fullscreen */}
      {lightbox !== null && galleryItems[lightbox] && (() => {
        const item = galleryItems[lightbox];
        let imgs: string[] = []; try { imgs = JSON.parse(item.images); } catch { imgs = []; }
        const all = [item.imageUrl, ...imgs].filter(Boolean) as string[];
        const cur = all[imgIdx] || all[0];
        return (
          <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Close */}
            <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 18, left: 18, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 16, padding: '6px 14px', zIndex: 2001 }}>✕</button>

            {/* Main image - fullscreen */}
            <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {cur && <img src={cur} alt={item.title} style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 12 }} />}
              {all.length > 1 && <>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + all.length) % all.length); }} style={{ position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 24, padding: '12px 16px', borderRadius: 8, cursor: 'pointer' }}>‹</button>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % all.length); }} style={{ position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', fontSize: 24, padding: '12px 16px', borderRadius: 8, cursor: 'pointer' }}>›</button>
              </>}
            </div>

            {/* Thumbnails + info */}
            <div onClick={e => e.stopPropagation()} style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{item.title}</div>
              {item.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>{item.description}</p>}
              {all.length > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                  {all.map((u, i) => (
                    <img key={i} src={u} alt="" onClick={() => setImgIdx(i)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: `2px solid ${i === imgIdx ? 'var(--teal)' : 'rgba(255,255,255,.2)'}`, cursor: 'pointer', transition: 'border-color .2s' }} />
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
