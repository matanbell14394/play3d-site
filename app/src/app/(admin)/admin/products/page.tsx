'use client';

import { useState, useEffect, useCallback } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  price: number;
}

interface MaterialLine {
  inventoryItemId: string;
  amountUsed: string;
}

interface Product {
  id: string;
  name: string;
  batchQuantity: number;
  printHours: number;
  operatorHours: number;
  markup: number;
  materials: { inventoryItem: InventoryItem; amountUsed: number }[];
}

const OPERATOR_RATE = 50; // ₪/hr default
const MACHINE_RATE = 5;  // ₪/hr default

function calcCost(product: Product, inventory: InventoryItem[]) {
  const matCost = product.materials.reduce((sum, m) => {
    const inv = inventory.find(i => i.id === m.inventoryItem.id);
    return sum + (inv ? inv.price * m.amountUsed : 0);
  }, 0);
  const machineCost = product.printHours * MACHINE_RATE;
  const operatorCost = product.operatorHours * OPERATOR_RATE;
  const totalCost = (matCost + machineCost + operatorCost) / (product.batchQuantity || 1);
  const price = totalCost * (1 + product.markup);
  return { totalCost, price };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('1');
  const [printHours, setPrintHours] = useState('0');
  const [operatorHours, setOperatorHours] = useState('0');
  const [markup, setMarkup] = useState('30');
  const [materials, setMaterials] = useState<MaterialLine[]>([{ inventoryItemId: '', amountUsed: '' }]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [p, i] = await Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/inventory').then(r => r.json()),
    ]);
    setProducts(Array.isArray(p) ? p : []);
    setInventory(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMaterial = () => setMaterials(m => [...m, { inventoryItemId: '', amountUsed: '' }]);
  const removeMaterial = (i: number) => setMaterials(m => m.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof MaterialLine, val: string) =>
    setMaterials(m => m.map((mat, idx) => idx === i ? { ...mat, [field]: val } : mat));

  const calcPreview = () => {
    const matCost = materials.reduce((sum, m) => {
      const inv = inventory.find(i => i.id === m.inventoryItemId);
      return sum + (inv ? inv.price * parseFloat(m.amountUsed || '0') : 0);
    }, 0);
    const machineCost = parseFloat(printHours || '0') * MACHINE_RATE;
    const operatorCost = parseFloat(operatorHours || '0') * OPERATOR_RATE;
    const totalCost = (matCost + machineCost + operatorCost) / (parseInt(batchQuantity || '1') || 1);
    const price = totalCost * (1 + parseFloat(markup || '0') / 100);
    return { totalCost: totalCost.toFixed(2), price: price.toFixed(2) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, batchQuantity, printHours, operatorHours, markup,
        materials: materials.filter(m => m.inventoryItemId && m.amountUsed),
      }),
    });
    setName(''); setBatchQuantity('1'); setPrintHours('0'); setOperatorHours('0');
    setMarkup('30'); setMaterials([{ inventoryItemId: '', amountUsed: '' }]);
    setSaving(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק מוצר זה?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const preview = calcPreview();

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>⬡</span> קטלוג ותימחור</div>
          <div className="pline" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Table */}
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th>מוצר</th>
                <th>זמנים (מכונה/אדם)</th>
                <th>עלות</th>
                <th>מחיר מומלץ</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text2)' }}>טוען...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>אין מוצרים עדיין</td></tr>
              ) : products.map(p => {
                const { totalCost, price } = calcCost(p, inventory);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><br /><span style={{ color: 'var(--text3)', fontSize: 11 }}>אצווה: {p.batchQuantity}</span></td>
                    <td>
                      <span style={{ color: 'var(--teal)', fontSize: 12 }}>מכונה: {p.printHours}ש&apos;</span><br />
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>מפעיל: {p.operatorHours}ש&apos;</span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>₪{totalCost.toFixed(1)}</td>
                    <td style={{ color: 'var(--teal)', fontWeight: 700 }}>₪{price.toFixed(1)}</td>
                    <td>
                      <button className="btn btn-d btn-sm" onClick={() => handleDelete(p.id)}>מחק</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add form */}
        <form className="card" onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="ch"><div className="ct">הוסף מוצר</div></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>שם המוצר</label>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} required placeholder="שם..." />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>כמות באצווה</label>
              <input className="inp" type="number" min="1" value={batchQuantity} onChange={e => setBatchQuantity(e.target.value)} />
            </div>

            {/* Materials */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block' }}>חומרים</label>
              {materials.map((mat, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 28px', gap: 6, marginBottom: 6 }}>
                  <select className="inp" value={mat.inventoryItemId} onChange={e => updateMaterial(i, 'inventoryItemId', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {inventory.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                    ))}
                  </select>
                  <input className="inp" type="number" min="0" step="0.01" placeholder="כמות" value={mat.amountUsed} onChange={e => updateMaterial(i, 'amountUsed', e.target.value)} />
                  {materials.length > 1 && (
                    <button type="button" onClick={() => removeMaterial(i)} style={{ background: 'var(--pink2)', border: '1px solid var(--pink)', borderRadius: 6, color: 'var(--pink)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addMaterial} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>+ הוסף חומר</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>זמן הדפסה (ש&apos;)</label>
                <input className="inp" type="number" min="0" step="0.25" value={printHours} onChange={e => setPrintHours(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>זמן מפעיל (ש&apos;)</label>
                <input className="inp" type="number" min="0" step="0.25" value={operatorHours} onChange={e => setOperatorHours(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>רווח (%)</label>
              <input className="inp" type="number" min="0" max="500" value={markup} onChange={e => setMarkup(e.target.value)} />
            </div>

            {/* Preview */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>עלות ליחידה:</span>
                <span style={{ color: 'var(--text)' }}>₪{preview.totalCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: 'var(--text2)' }}>מחיר מומלץ:</span>
                <span style={{ color: 'var(--teal)' }}>₪{preview.price}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-t" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'שומר...' : '+ הוסף מוצר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
