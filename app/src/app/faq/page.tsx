'use client';
import { useState } from 'react';
import SiteNav from '@/components/SiteNav';

const FAQS = [
  {
    q: 'מה זה הדפסת תלת מימד FDM?',
    a: 'FDM (Fused Deposition Modeling) היא השיטה הנפוצה ביותר להדפסת תלת מימד. הפילמנט מחומם ומוחדר שכבה על שכבה עד שמתקבל המוצר הסופי. מתאים לרוב הפרויקטים — מאבות טיפוס ועד מוצרים סופיים.',
  },
  {
    q: 'אילו חומרים אתם מדפיסים?',
    a: 'אנו מדפיסים ביותר מ-20 סוגי חומרים: PLA, PETG, ABS, TPU, ASA, PA (ניילון), FLEX ועוד. לכל חומר תכונות שונות — חוזק, גמישות, עמידות בחום וכימיקלים. הכנס לדף החומרים לפרטים מלאים.',
  },
  {
    q: 'כמה זמן לוקח הדפסה?',
    a: 'תלוי בגודל ובסיבוכיות המודל. חלקים קטנים עשויים לקחת שעה אחת, חלקים גדולים עשרות שעות. אנו מספקים הערכת זמן לפני אישור ההזמנה.',
  },
  {
    q: 'מה הגודל המקסימלי שניתן להדפיס?',
    a: 'עם Bambu P1S נגיע לגודל מקסימלי של 256×256×256 מ"מ. לחלקים גדולים יותר ניתן לפצל לחלקים ולהרכיב.',
  },
  {
    q: 'האם אתם יכולים לעזור לי לעצב את המודל?',
    a: 'כן! אם אין לך קובץ STL, נוכל לסייע בעיצוב מאפס או לשנות עיצוב קיים בהתאם לצרכיך. צור קשר לפרטים ותמחור.',
  },
  {
    q: 'איזה פורמטים אתם מקבלים?',
    a: 'אנו מקבלים STL, OBJ, 3MF, STEP ועוד. פורמט ה-3MF הוא המועדף — הוא שומר מידע מקיף יותר על המודל.',
  },
  {
    q: 'מה המחיר להדפסה?',
    a: 'המחיר מחושב לפי זמן הדפסה, כמות חומר, וסוג הפילמנט. ניתן לקבל הערכת מחיר מיידית דרך קישור MakerWorld בטופס ההזמנה. צור קשר לציטוט מדויק.',
  },
  {
    q: 'האם אתם שולחים לכל הארץ?',
    a: 'כן, אנו שולחים לכל רחבי הארץ. ניתן גם לאסוף עצמאית מטבעון בתיאום מראש.',
  },
  {
    q: 'האם ניתן להזמין בכמויות גדולות?',
    a: 'בהחלט. אנו מציעים הנחות לכמויות. מינימום להזמנת כמות הוא 10 יחידות — צור קשר לקבלת הצעת מחיר.',
  },
  {
    q: 'מה איכות ההדפסה?',
    a: 'אנו עובדים עם מדפסת Bambu P1S — אחת מהמדפסות הדיוקניות בשוק הצרכני. רזולוציית שכבה מ-0.05 עד 0.35 מ"מ בהתאם לדרישות הפרויקט.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ maxWidth: 760, margin: '100px auto 80px', padding: '0 24px', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 12 }}>// שאלות נפוצות</div>
          <h1 className="sh-title">כל מה שרצית לדעת</h1>
          <div className="sh-line" style={{ margin: '12px auto 0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${open === i ? 'var(--teal)' : 'var(--border)'}`,
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'border-color .2s',
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text)', fontSize: 15, fontWeight: 600, textAlign: 'right', gap: 12,
                  fontFamily: 'inherit',
                }}
              >
                <span>{faq.q}</span>
                <span style={{ color: 'var(--teal)', fontSize: 18, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 20px 18px', color: 'var(--text2)', fontSize: 14, lineHeight: 1.8 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>לא מצאת תשובה?</div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>אנו כאן לעזור — פנה אלינו ישירות</p>
          <a href="/#contact" className="btn-hero" style={{ display: 'inline-block', fontSize: 14, padding: '10px 28px' }}>צור קשר</a>
        </div>
      </main>
    </>
  );
}
