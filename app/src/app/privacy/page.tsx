import Link from 'next/link';
import SiteNav from '@/components/SiteNav';

export const metadata = {
  title: 'מדיניות פרטיות | PLAY3D',
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ maxWidth: 760, margin: '100px auto 60px', padding: '0 24px', direction: 'rtl' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>מדיניות פרטיות</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32, fontSize: 13 }}>
          עדכון אחרון: מרץ 2026
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>1. מי אנחנו</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            PLAY3D — שירות הדפסות תלת מימד, טבעון ישראל. טלפון: 052-6018145.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>2. מידע שאנו אוספים</h2>
          <ul style={{ lineHeight: 2, color: 'var(--text2)', paddingRight: 20 }}>
            <li><strong>מידע שמסרת לנו:</strong> שם, טלפון / דוא"ל שמסרת בטופס יצירת קשר או הזמנה</li>
            <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, דפים שבוקרו — לצורך ניתוח תנועה ושיפור השירות</li>
            <li><strong>קובצי Cookie:</strong> שמירת העדפות (מצב כהה/בהיר, הגדרות נגישות, הסכמה לעוגיות)</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>3. שימוש במידע</h2>
          <ul style={{ lineHeight: 2, color: 'var(--text2)', paddingRight: 20 }}>
            <li>מתן מענה לפניות ועיבוד הזמנות</li>
            <li>שיפור חוויית המשתמש באתר</li>
            <li>אנו לא מוכרים ולא מעבירים מידע לצד שלישי לצרכי שיווק</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>4. Cookie — עוגיות</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            האתר משתמש ב-Cookie לצרכים טכניים בלבד (העדפות תצוגה, הסכמה לעוגיות). לחיצה על "אני מסכים/ה" בבאנר מהווה הסכמה. ניתן לבטל בכל עת דרך הגדרות הדפדפן.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>5. אבטחת מידע</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            האתר פועל תחת פרוטוקול HTTPS. הנתונים מאוחסנים בשרתי Neon (PostgreSQL) עם הצפנה. הגישה לנתונים מוגבלת לצוות המורשה בלבד.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>6. זכויותיך</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            בהתאם לחוק הגנת הפרטיות, תשמ"א-1981, יש לך זכות לעיין במידע שנאסף עליך, לתקנו או למחקו. לפנייה:{' '}
            <Link href="/#contact" style={{ color: 'var(--teal)' }}>טופס יצירת קשר</Link>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>7. שינויים במדיניות</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text2)' }}>
            אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו בעמוד זה.
          </p>
        </section>
      </main>
    </>
  );
}
