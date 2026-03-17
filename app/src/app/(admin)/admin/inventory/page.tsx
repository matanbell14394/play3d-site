'use client';

import { useState, useEffect, useCallback } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
}

const TYPES = ['FILAMENT', 'RESIN', 'SPARE_PART', 'TOOL', 'OTHER'];
const TYPE_LABELS: Record<string, string> = {
  FILAMENT: 'פילמנט', RESIN: 'שרף', SPARE_PART: 'חלק חילוף', TOOL: 'כלי', OTHER: 'אחר',
};
const LOW_THRESHOLD = 200;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('FILAMENT');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [price, setPrice] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/inventory').then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditItem(null);
    setName(''); setType('FILAMENT'); setQuantity(''); setUnit('g'); setPrice('');
    setShowForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setName(item.name); setType(item.type);
    setQuantity(String(item.quantity)); setUnit(item.unit); setPrice(String(item.price));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { name, type, quantity, unit, price };
    if (editItem) {
      await fetch(`/api/inventory/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setShowForm(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק פריט זה?')) return;
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const lowStock = items.filter(i => i.unit === 'g' && i.quantity < LOW_THRESHOLD);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>⊞</span> מלאי חומרים</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm" onClick={openAdd}>+ פריט חדש</button>
      </div>

      <div className="sg">
        <div className="sc"><div className="slbl">סה&quot;כ פריטים</div><div className="sval">{items.length}</div></div>
        <div className="sc pk"><div className="slbl">מלאי נמוך</div><div className="sval">{lowStock.length}</div></div>
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
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>טוען...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>אין פריטי מלאי — לחץ &quot;+ פריט חדש&quot;</td></tr>
            ) : items.map(item => {
              const pct = Math.min(100, (item.quantity / 1000) * 100);
              const color = item.quantity < LOW_THRESHOLD ? 'var(--pink)' : item.quantity < 500 ? 'var(--gold)' : 'var(--teal)';
              return (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="badge bt">{TYPE_LABELS[item.type] ?? item.type}</span></td>
                  <td style={{ color: item.quantity < LOW_THRESHOLD ? 'var(--pink)' : 'inherit' }}>{item.quantity}</td>
                  <td style={{ color: 'var(--text2)' }}>{item.unit}</td>
                  <td>₪{item.price}</td>
                  <td>
                    <div className="invbar" style={{ width: 80 }}>
                      <div className="invfill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: 'var(--teal3)', border: '1px solid var(--border)', color: 'var(--teal)' }} onClick={() => openEdit(item)}>עריכה</button>
                    <button className="btn btn-d btn-sm" onClick={() => handleDelete(item.id)}>מחק</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div className="ct">{editItem ? 'עריכת פריט' : 'פריט חדש'}</div>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>שם</label>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} required placeholder="למשל: PLA שחור 1KG" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>סוג</label>
              <select className="inp" value={type} onChange={e => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>כמות</label>
                <input className="inp" type="number" min="0" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>יחידה</label>
                <select className="inp" value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="g">גרם (g)</option>
                  <option value="kg">קילוגרם (kg)</option>
                  <option value="ml">מיליליטר (ml)</option>
                  <option value="pcs">יחידות (pcs)</option>
                  <option value="m">מטר (m)</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>מחיר ליחידה (₪)</label>
              <input className="inp" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-t" disabled={saving}>{saving ? 'שומר...' : editItem ? 'עדכן' : 'הוסף פריט'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
