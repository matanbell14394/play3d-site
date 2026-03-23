import SiteNav from '@/components/SiteNav';
import Link from 'next/link';

const STEPS = [
  {
    num: '01', icon: '📐', title: 'הכנת קובץ',
    desc: 'שולחים לנו קובץ STL / OBJ / 3MF, או קישור מ-MakerWorld. אין קובץ? אנו יכולים לעזור בעיצוב.',
    tip: 'טיפ: 3MF עדיף על STL — שומר מידע על גודל וצבע',
  },
  {
    num: '02', icon: '⚙️', title: 'הגדרות פרוסה (Slicing)',
    desc: 'המודל עובר תוכנת פריסה (Bambu Studio) שמחשבת שכבות, תמיכות, מילוי (infill) ומהירות — בהתאם לחומר ולשימוש.',
    tip: 'טיפ: infill גבוה = חזק יותר אבל איטי וכבד יותר',
  },
  {
    num: '03', icon: '🖨️', title: 'הדפסה',
    desc: 'המדפסת Bambu P1S מחממת את הפילמנט ומדפיסה שכבה אחר שכבה. כל שכבה מ-0.05 עד 0.35 מ"מ.',
    tip: 'טיפ: Bambu P1S מדפיסה ב-256×256×256 מ"מ עם דיוק של עד 0.05 מ"מ לשכבה',
  },
  {
    num: '04', icon: '✂️', title: 'לאחר ההדפסה',
    desc: 'הסרת תמיכות, ניקוי שאריות, בדיקת איכות. לפי דרישה: שיוף, צביעה, ציפוי אפוקסי.',
    tip: 'טיפ: תמיכות מסיסות במים (PVA) חוסכות זמן ניקוי',
  },
  {
    num: '05', icon: '📦', title: 'אריזה ומשלוח',
    desc: 'המוצר נארז בקפידה ונשלח לכל הארץ, או נאסף עצמאית מטבעון בתיאום מראש.',
    tip: 'טיפ: חלקים גדולים נשלחים בקרטון מוגן',
  },
];

const MATERIALS_QUICK = [
  { name: 'PLA', color: '#00e5cc', use: 'מודלים, עיצוב, אבות טיפוס' },
  { name: 'PETG', color: '#3b82f6', use: 'חלקים פונקציונליים, מכלים' },
  { name: 'ABS', color: '#f59e0b', use: 'עמיד בחום, תעשייה' },
  { name: 'TPU', color: '#ec4899', use: 'גמיש, גריפ, כיסויים' },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ direction: 'rtl' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '100px 24px 60px', maxWidth: 700, margin: '0 auto' }}>
          <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 12 }}>// איך זה עובד</div>
          <h1 className="sh-title">מהקובץ למוצר — תהליך ההדפסה</h1>
          <div className="sh-line" style={{ margin: '12px auto 16px' }} />
          <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.8 }}>
            הדפסת FDM (Fused Deposition Modeling) היא שיטת הדפסה בפילמנט — חוט פלסטיק שמחמם ומוחדר שכבה-שכבה.
          </p>
        </div>

        {/* Steps */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 80px' }}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: 'grid', gridTemplateColumns: '80px 1fr', gap: 24, marginBottom: 32,
                padding: 28, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16,
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Step number background */}
              <div style={{ position: 'absolute', top: -10, left: 16, fontFamily: 'var(--font-orbitron)', fontSize: 80, fontWeight: 900, color: 'var(--teal)', opacity: 0.04, lineHeight: 1 }}>{step.num}</div>

              {/* Icon + number */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal3)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{step.icon}</div>
                <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 11, color: 'var(--teal)', fontWeight: 700 }}>{step.num}</div>
                {i < STEPS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'linear-gradient(to bottom, var(--teal), transparent)', opacity: 0.3 }} />}
              </div>

              {/* Content */}
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>{step.title}</h2>
                <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{step.desc}</p>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--teal)', display: 'inline-block' }}>
                  💡 {step.tip}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Materials quick */}
        <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '48px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 32 }}>חומרים נפוצים</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              {MATERIALS_QUICK.map(m => (
                <div key={m.name} style={{ background: 'var(--card-bg)', border: `1px solid ${m.color}40`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-orbitron)', fontSize: 20, fontWeight: 700, color: m.color, marginBottom: 8 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{m.use}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/materials" className="btn btn-t">מידע מלא על החומרים ←</Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>מוכן להתחיל?</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>שלח קובץ ונחזור אליך עם הצעת מחיר תוך 24 שעות</p>
          <Link href="/order" className="btn-hero" style={{ display: 'inline-block', fontSize: 15 }}>הזמן הדפסה עכשיו</Link>
        </div>
      </main>
    </>
  );
}
