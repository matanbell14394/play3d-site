'use client';

import { useState } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
}

export default function InventoryPage() {
  const [items] = useState<InventoryItem[]>([]);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>⊞</span> מלאי</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm">+ פריט</button>
      </div>

      <div className="sg">
        <div className="sc"><div className="slbl">סה&quot;כ פריטים</div><div className="sval">{items.length}</div></div>
        <div className="sc pk"><div className="slbl">מלאי נמוך</div><div className="sval">0</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>שם</th>
              <th>סוג</th>
              <th>כמות</th>
              <th>יחידה</th>
              <th>מחיר/יח&apos;</th>
              <th>רמה</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>
                  אין פריטי מלאי עדיין
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td><span className="badge bt">{item.type}</span></td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>₪{item.price}</td>
                <td>
                  <div className="invbar" style={{ width: 80 }}>
                    <div className="invfill" style={{ width: '60%', background: 'var(--teal)' }} />
                  </div>
                </td>
                <td><button className="btn btn-d btn-sm">מחק</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
