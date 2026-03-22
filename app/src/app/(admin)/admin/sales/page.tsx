'use client';

import { useState, useEffect, useCallback } from 'react';

interface Sale {
  id: string;
  productName: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  profit: number;
  note: string | null;
  createdAt: string;
}

function fmt(n: number) { return n.toFixed(2); }
function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/sales');
    const d = await r.json();
    setSales(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const filtered = sales.filter(s =>
    s.productName.includes(filter) || (s.note || '').includes(filter)
  );

  const totalRevenue = filtered.reduce((s, x) => s + x.salePrice, 0);
  const totalCost = filtered.reduce((s, x) => s + x.costPrice, 0);
  const totalProfit = filtered.reduce((s, x) => s + x.profit, 0);
  const totalUnits = filtered.reduce((s, x) => s + x.quantity, 0);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>💰</span> היסטוריית מכירות</div>
          <div className="pline" />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'הכנסות', value: `₪${fmt(totalRevenue)}`, color: 'var(--teal)' },
          { label: 'עלויות', value: `₪${fmt(totalCost)}`, color: 'var(--text2)' },
          { label: 'רווח נקי', value: `₪${fmt(totalProfit)}`, color: totalProfit >= 0 ? '#4ade80' : 'var(--pink)' },
          { label: 'יחידות נמכרו', value: totalUnits, color: 'var(--text1)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 12 }}>
        <input
          className="inp"
          placeholder="🔍 חיפוש לפי מוצר / הערה..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>מוצר</th>
              <th>כמות</th>
              <th>הכנסה</th>
              <th>עלות</th>
              <th>רווח</th>
              <th>הערה</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>טוען...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>אין מכירות עדיין</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmtDate(s.createdAt)}</td>
                <td><strong>{s.productName}</strong></td>
                <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                <td style={{ color: 'var(--teal)', fontWeight: 600 }}>₪{fmt(s.salePrice)}</td>
                <td style={{ color: 'var(--text2)' }}>₪{fmt(s.costPrice)}</td>
                <td style={{ color: s.profit >= 0 ? '#4ade80' : 'var(--pink)', fontWeight: 700 }}>₪{fmt(s.profit)}</td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{s.note || '—'}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                <td colSpan={2} style={{ color: 'var(--text2)' }}>סה"כ</td>
                <td style={{ textAlign: 'center' }}>{totalUnits}</td>
                <td style={{ color: 'var(--teal)' }}>₪{fmt(totalRevenue)}</td>
                <td style={{ color: 'var(--text2)' }}>₪{fmt(totalCost)}</td>
                <td style={{ color: totalProfit >= 0 ? '#4ade80' : 'var(--pink)' }}>₪{fmt(totalProfit)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
