import Link from "next/link";

export default function OrderSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div className="grid-bg" />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 6%' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--teal3)', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>
          ✓
        </div>
        <div className="sh-tag" style={{ textAlign: 'center', marginBottom: 8 }}>// ההזמנה נשלחה</div>
        <h1 className="sh-title" style={{ textAlign: 'center', marginBottom: 12 }}>תודה! ההזמנה התקבלה</h1>
        <div className="sh-line" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.8, maxWidth: 420, margin: '0 auto 32px' }}>
          קיבלנו את הבקשה שלך ונחזור אליך עם הצעת מחיר ופרטים תוך 24 שעות.
        </p>
        <Link href="/" className="btn-hero">חזרה לדף הבית</Link>
      </div>
    </div>
  );
}
