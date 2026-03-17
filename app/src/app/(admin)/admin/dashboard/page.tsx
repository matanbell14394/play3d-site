import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>◈</span> לוח בקרה</div>
          <div className="pline" />
        </div>
        <Link href="/admin/orders" className="btn btn-t btn-sm">+ הזמנה</Link>
      </div>

      {/* Welcome banner */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(0,229,204,.07),transparent)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>ברוך הבא,</div>
          <div style={{ fontFamily: 'var(--font-orbitron), monospace', fontSize: 16, fontWeight: 700 }}>
            שלום, <span style={{ color: 'var(--teal)' }}>{session?.user?.name ?? 'Admin'}</span> 👋
          </div>
          <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
            <Link href="/admin/orders" className="btn btn-t btn-sm">הזמנות</Link>
            <Link href="/admin/inventory" className="btn btn-g btn-sm">מלאי</Link>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-orbitron), monospace', fontSize: 58, fontWeight: 900, opacity: 0.06, color: 'var(--teal)' }}>3D</div>
      </div>

      {/* Stats */}
      <div className="sg">
        <div className="sc"><div className="slbl">הזמנות פתוחות</div><div className="sval">—</div></div>
        <div className="sc pk"><div className="slbl">הכנסות</div><div className="sval">₪—</div></div>
        <div className="sc"><div className="slbl">לקוחות</div><div className="sval">—</div></div>
        <div className="sc pk"><div className="slbl">פריטי מלאי</div><div className="sval">—</div></div>
      </div>

      {/* Quick links grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="ch"><div className="ct">הזמנות אחרונות</div><Link href="/admin/orders" className="btn btn-g btn-sm">הכל</Link></div>
          <div style={{ padding: 16, color: 'var(--text3)', fontSize: 12 }}>טען נתונים מה-API</div>
        </div>
        <div className="card">
          <div className="ch"><div className="ct">מלאי נמוך</div><Link href="/admin/inventory" className="btn btn-g btn-sm">הכל</Link></div>
          <div style={{ padding: 16, color: 'var(--text3)', fontSize: 12 }}>טען נתונים מה-API</div>
        </div>
      </div>
    </div>
  );
}
