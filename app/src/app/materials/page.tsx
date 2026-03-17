'use client';

import { useState } from 'react';
import Link from 'next/link';

const MATERIALS = [
  {
    id: 'pla',
    name: 'PLA',
    full: 'Polylactic Acid',
    color: '#00e5cc',
    bgColor: 'rgba(0,229,204,.1)',
    emoji: '🌿',
    tagline: 'קל ומדויק',
    desc: 'החומר הפופולרי ביותר — קל להדפסה, פרטים חדים, ומתאים לרוב הפרויקטים. מבוסס עמילן תירס, ידידותי לסביבה.',
    tags: ['קל למדפסת', 'פרטים עדינים', 'אקולוגי', 'צבעים רבים'],
    specs: { temp: '60°C', difficulty: 5, strength: 3, price: '₪60–80/ק"ג', enclosure: 'לא' },
    useCases: ['פיגורינות ומיניאטורות', 'אבות טיפוס', 'עיצוב פנים', 'מוצרי תצוגה'],
  },
  {
    id: 'petg',
    name: 'PETG',
    full: 'Polyethylene Terephthalate Glycol',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,.1)',
    emoji: '💧',
    tagline: 'חזק וגמיש',
    desc: 'שילוב מנצח של חוזק, גמישות ועמידות כימית. מצוין לחלקים פונקציונליים שצריכים לעמוד בעומס.',
    tags: ['עמיד למים', 'חזק', 'גמיש קצת', 'עמיד UV'],
    specs: { temp: '80°C', difficulty: 4, strength: 4, price: '₪80–110/ק"ג', enclosure: 'מומלץ' },
    useCases: ['בקבוקים וכלי מטבח', 'חלקי מכונות', 'מארזים', 'קופסות עם מכסים'],
  },
  {
    id: 'abs',
    name: 'ABS',
    full: 'Acrylonitrile Butadiene Styrene',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,.1)',
    emoji: '⚙️',
    tagline: 'תעשייתי',
    desc: 'פלסטיק תעשייתי עם עמידות חום גבוהה. מושלם לחלקים פונקציונליים ומכניים, דורש תנאי הדפסה מדויקים.',
    tags: ['עמיד חום', 'תעשייתי', 'ניתן לעיבוד', 'אסטון חלק'],
    specs: { temp: '105°C', difficulty: 2, strength: 5, price: '₪70–100/ק"ג', enclosure: 'חובה' },
    useCases: ['חלקי מנועים', 'פגושים', 'מוצרי חשמל', 'כלי עבודה'],
  },
  {
    id: 'tpu',
    name: 'TPU',
    full: 'Thermoplastic Polyurethane',
    color: '#a855f7',
    bgColor: 'rgba(168,85,247,.1)',
    emoji: '🔵',
    tagline: 'גומי גמיש',
    desc: 'חומר גמיש ורך כגומי. מצוין לחלקים שצריכים לספוג זעזועים, לכיסויים ולמוצרי ספורט.',
    tags: ['גמיש מאוד', 'עמיד פגיעות', 'נוח למגע', 'אנטי-החלקה'],
    specs: { temp: '80°C', difficulty: 3, strength: 3, price: '₪120–180/ק"ג', enclosure: 'לא' },
    useCases: ['כיסויי טלפון', 'נעליים ואינסולות', 'דירוגי', 'מוצרי ספורט'],
  },
];

function RatingDots({ count, total = 5, color }: { count: number; total?: number; color: string }) {
  return (
    <div className="rat">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rd" style={i < count ? { background: color } : {}} />
      ))}
    </div>
  );
}

export default function MaterialsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const activeMat = MATERIALS.find((m) => m.id === selected);

  return (
    <>
      <div className="grid-bg" />

      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-logo">PLAY3D</Link>
        <div className="nav-links">
          <Link href="/" className="nl">בית</Link>
          <Link href="/materials" className="nl active">חומרים</Link>
          <Link href="/#gallery" className="nl">גלריה</Link>
          <Link href="/#about" className="nl">אודות</Link>
          <Link href="/#contact" className="nl">צור קשר</Link>
          <Link href="/login" className="nl special">אזור לקוח</Link>
        </div>
      </nav>

      <div className="section" style={{ paddingTop: 80 }}>
        {/* Material detail view */}
        {activeMat ? (
          <div>
            <button
              onClick={() => setSelected(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border2)', color: 'var(--text2)', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, transition: 'all .2s' }}
            >
              ← חזרה לכל החומרים
            </button>
            <div className="mat-detail-hero" style={{ background: activeMat.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, borderRadius: 16, height: 220, marginBottom: 28, position: 'relative' }}>
              {activeMat.emoji}
              <div className="mat-detail-title" style={{ color: activeMat.color }}>
                {activeMat.name}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div className="sh">
                  <div className="sh-tag" style={{ color: activeMat.color }}>// {activeMat.name}</div>
                  <h2 className="sh-title">{activeMat.full}</h2>
                  <div className="sh-line" />
                  <p className="sh-sub">{activeMat.desc}</p>
                </div>
                <div className="mat-tags">
                  {activeMat.tags.map((tag) => (
                    <span key={tag} className="mat-tag badge bt">{tag}</span>
                  ))}
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>שימושים נפוצים</div>
                  <ul className="about-list">
                    {activeMat.useCases.map((uc) => (
                      <li key={uc}>{uc}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <div className="mat-specs-mini" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="mspec"><div className="mspec-lbl">עמידות חום</div><div className="mspec-val" style={{ color: activeMat.color }}>{activeMat.specs.temp}</div></div>
                  <div className="mspec"><div className="mspec-lbl">מחיר לק"ג</div><div className="mspec-val">{activeMat.specs.price}</div></div>
                  <div className="mspec"><div className="mspec-lbl">Enclosure</div><div className="mspec-val">{activeMat.specs.enclosure}</div></div>
                  <div className="mspec">
                    <div className="mspec-lbl">קלות הדפסה</div>
                    <RatingDots count={activeMat.specs.difficulty} color={activeMat.color} />
                  </div>
                  <div className="mspec">
                    <div className="mspec-lbl">חוזק</div>
                    <RatingDots count={activeMat.specs.strength} color={activeMat.color} />
                  </div>
                </div>
                <Link href="/#order" className="btn btn-t" style={{ display: 'block', textAlign: 'center', marginTop: 16, padding: '13px', borderRadius: 10, background: `linear-gradient(135deg, ${activeMat.color}, ${activeMat.color}99)`, border: 'none', color: 'var(--bg)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', textDecoration: 'none' }}>
                  הזמן הדפסה ב-{activeMat.name}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Material hub */
          <div>
            <div className="sh">
              <div className="sh-tag">// חומרי הדפסה FDM</div>
              <h2 className="sh-title">בחר את החומר הנכון</h2>
              <div className="sh-line" />
              <p className="sh-sub">כל חומר מתאים למטרה אחרת — חוזק, גמישות, עמידות חום, ומחיר.</p>
            </div>

            {/* Quick nav strip */}
            <div style={{ display: 'flex', borderRadius: 11, overflow: 'hidden', marginBottom: 28, maxWidth: 560 }}>
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  style={{ flex: 1, padding: 13, textAlign: 'center', background: m.bgColor, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                >
                  <div style={{ fontFamily: 'var(--font-orbitron), monospace', fontSize: 13, fontWeight: 700, color: m.color }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: m.color, opacity: 0.7 }}>{m.tagline}</div>
                </button>
              ))}
            </div>

            {/* Material cards */}
            <div className="mat-cards">
              {MATERIALS.map((m) => (
                <div key={m.id} className="mat-card" onClick={() => setSelected(m.id)}>
                  <div className="mat-top" style={{ background: m.bgColor }}>
                    <div className="mat-abbr" style={{ color: m.color }}>{m.name}</div>
                    <div style={{ fontSize: 52 }}>{m.emoji}</div>
                    <span className="mat-badge2 badge" style={{ background: m.bgColor, color: m.color, border: `1px solid ${m.color}33` }}>
                      {m.tagline}
                    </span>
                  </div>
                  <div className="mat-body">
                    <div className="mat-name" style={{ color: m.color }}>{m.name}</div>
                    <div className="mat-full">{m.full}</div>
                    <p className="mat-desc">{m.desc}</p>
                    <div className="mat-tags">
                      {m.tags.map((tag) => (
                        <span key={tag} className="mat-tag badge bt">{tag}</span>
                      ))}
                    </div>
                    <div className="mat-specs-mini">
                      <div className="mspec"><div className="mspec-lbl">עמידות חום</div><div className="mspec-val" style={{ color: m.color }}>{m.specs.temp}</div></div>
                      <div className="mspec"><div className="mspec-lbl">מחיר</div><div className="mspec-val">{m.specs.price}</div></div>
                    </div>
                    <button
                      className="mat-cta-link"
                      style={{ background: m.bgColor, color: m.color, border: `1px solid ${m.color}33` }}
                    >
                      <span>קרא עוד על {m.name}</span>
                      <span>←</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div style={{ marginTop: 44 }}>
              <div className="sh">
                <div className="sh-tag">// השוואה</div>
                <h2 className="sh-title">PLA · PETG · ABS · TPU</h2>
                <div className="sh-line" />
              </div>
              <div className="card">
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th>מאפיין</th>
                      {MATERIALS.map((m) => (
                        <th key={m.id} style={{ color: m.color }}>{m.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>קלות הדפסה</td>
                      {MATERIALS.map((m) => (
                        <td key={m.id}><RatingDots count={m.specs.difficulty} color={m.color} /></td>
                      ))}
                    </tr>
                    <tr>
                      <td>חוזק</td>
                      {MATERIALS.map((m) => (
                        <td key={m.id}><RatingDots count={m.specs.strength} color={m.color} /></td>
                      ))}
                    </tr>
                    <tr>
                      <td>עמידות חום</td>
                      {MATERIALS.map((m) => (
                        <td key={m.id} style={{ color: m.color }}>{m.specs.temp}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Enclosure?</td>
                      {MATERIALS.map((m) => (
                        <td key={m.id} style={{ color: m.color }}>{m.specs.enclosure}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>מחיר לק"ג</td>
                      {MATERIALS.map((m) => (
                        <td key={m.id} style={{ color: m.color }}>{m.specs.price}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
