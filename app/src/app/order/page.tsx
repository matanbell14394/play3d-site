'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OrderForm } from "@/features/orders/components/OrderForm";

export default function OrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/order");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="grid-bg" />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 48, height: 48, border: '3px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div className="grid-bg" />

      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-logo">PLAY3D</Link>
        <div className="nav-links">
          <Link href="/" className="nl">בית</Link>
          <Link href="/materials" className="nl">חומרים</Link>
          <span className="nl active">הזמנה</span>
        </div>
      </nav>

      <main style={{ paddingTop: 100, paddingBottom: 60, paddingInline: '6%', maxWidth: 780, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div className="sh-tag" style={{ textAlign: 'center' }}>// הגשת הזמנה</div>
          <h1 className="sh-title" style={{ textAlign: 'center', marginBottom: 8 }}>הזמן הדפסת תלת מימד</h1>
          <div className="sh-line" style={{ margin: '10px auto' }} />
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>
            מלא את הפרטים ונחזור אליך עם הצעת מחיר תוך 24 שעות.
          </p>
        </div>

        {/* Form wrapper */}
        <div className="order-wrap">
          <OrderForm />
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
