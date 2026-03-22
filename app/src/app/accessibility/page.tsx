import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

export const metadata = {
  title: 'הצהרת נגישות | PLAY3D',
};

export default function AccessibilityPage() {
  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ maxWidth: 760, margin: '100px auto 60px', padding: '0 24px', direction: 'rtl' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>הצהרת נגישות</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 13 }}>
          עדכון אחרון: מרץ 2026
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>מחויבותנו לנגישות</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            PLAY3D מחויבת לנגישות דיגיטלית לאנשים עם מוגבלות. אנו עושים מאמצים מתמשכים לשיפור נגישות האתר בהתאם לתקן הישראלי{' '}
            <strong>ת"י 5568</strong> ברמה{' '}
            <strong>AA</strong>, המבוסס על{' '}
            <strong>WCAG 2.1</strong>.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>מה אנו עשינו</h2>
          <ul style={{ lineHeight: 2, color: 'var(--text2)', paddingRight: 20 }}>
            <li>כל התמונות באתר כוללות תיאור טקסטואלי (alt text)</li>
            <li>ניתן לנווט באתר באמצעות מקלדת בלבד</li>
            <li>הגדרת שפה ראשית לכל עמוד (lang="he")</li>
            <li>ניגודיות צבעים עומדת בדרישות WCAG 2.1 AA</li>
            <li>כפתורים וקישורים כוללים תוויות ARIA</li>
            <li>קיים דילוג לתוכן הראשי (Skip to content)</li>
            <li>תפריט נגישות הכולל: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא והפסקת אנימציות</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>מגבלות ידועות</h2>
          <ul style={{ lineHeight: 2, color: 'var(--text2)', paddingRight: 20 }}>
            <li>חלק מהתכנים ויזואליים בלבד (גלריית מודלים תלת-מימד) ועשויים להיות מוגבלים</li>
            <li>קבצי PDF שהועלו על ידי צד שלישי עשויים שלא להיות נגישים במלואם</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>יצירת קשר בנושא נגישות</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            נתקלת בבעיית נגישות? אנו מזמינים אותך לפנות אלינו:
          </p>
          <ul style={{ lineHeight: 2.2, color: 'var(--text2)', paddingRight: 20 }}>
            <li><strong>רכז נגישות:</strong> PLAY3D</li>
            <li><strong>טלפון:</strong> 052-6018145</li>
            <li><strong>כתובת:</strong> טבעון, ישראל</li>
            <li>
              <strong>צור קשר:</strong>{' '}
              <Link href="/#contact" style={{ color: 'var(--teal)' }}>טופס יצירת קשר</Link>
            </li>
          </ul>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)', marginTop: 12 }}>
            אנו נשתדל לטפל בפנייתך ולחזור אליך תוך <strong>5 ימי עסקים</strong>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>בסיס משפטי</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            הצהרה זו מוגשת בהתאם ל<strong>חוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח-1998</strong>{' '}
            ותקנות הנגישות לשירות (תשע"ג-2013).
          </p>
        </section>
      </main>
    </>
  );
}
