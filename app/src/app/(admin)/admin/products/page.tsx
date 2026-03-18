'use client';

import { useState, useEffect, useCallback } from 'react';

interface InventoryItem { id: string; name: string; type: string; unit: string; price: number; }
interface MaterialLine { inventoryItemId: string; amountUsed: string; }
interface Product {
  id: string; name: string; batchQuantity: number; printHours: number;
  operatorHours: number; markup: number;
  materials: { inventoryItem: InventoryItem; amountUsed: number }[];
}

const OPERATOR_RATE = 50;
const MACHINE_RATE = 5;

function calcCost(product: Product, inventory: InventoryItem[]) {
  const matCost = product.materials.reduce((sum, m) => {
    const inv = inventory.find(i => i.id === m.inventoryItem.id);
    return sum + (inv ? inv.price * m.amountUsed : 0);
  }, 0);
  const machineCost = product.printHours * MACHINE_RATE;
  const operatorCost = product.operatorHours * OPERATOR_RATE;
  const totalCost = (matCost + machineCost + operatorCost) / (product.batchQuantity || 1);
  return { totalCost, price: totalCost * (1 + product.markup) };
}

const emptyForm = { name: '', batchQuantity: '1', printHours: '0', operatorHours: '0', markup: '30' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
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
    const machineCost = parseFloat(form.printHours || '0') * MACHINE_RATE;
    const operatorCost = parseFloat(form.operatorHours || '0') * OPERATOR_RATE;
    const totalCost = (matCost + machineCost + operatorCost) / (parseInt(form.batchQuantity || '1') || 1);
    const price = totalCost * (1 + parseFloat(form.markup || '0') / 100);
    return { totalCost: totalCost.toFixed(2), price: price.toFixed(2) };
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      batchQuantity: String(p.batchQuantity),
      printHours: String(p.printHours),
      operatorHours: String(p.operatorHours),
      markup: String(Math.round(p.markup * 100)),
    });
    setMaterials(p.materials.length > 0
      ? p.materials.map(m => ({ inventoryItemId: m.inventoryItem.id, amountUsed: String(m.amountUsed) }))
      : [{ inventoryItemId: '', amountUsed: '' }]);
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setMaterials([{ inventoryItemId: '', amountUsed: '' }]); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      name: form.name, batchQuantity: form.batchQuantity,
      printHours: form.printHours, operatorHours: form.operatorHours, markup: form.markup,
      materials: materials.filter(m => m.inventoryItemId && m.amountUsed),
    };
    if (editingId) {
      await fetch(`/api/products/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setEditingId(null);
    } else {
      await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setForm(emptyForm); setMaterials([{ inventoryItemId: '', amountUsed: '' }]);
    setSaving(false); fetchAll();
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
                  <tr key={p.id} style={{ background: editingId === p.id ? 'rgba(0,229,204,.05)' : undefined }}>
                    <td><strong>{p.name}</strong><br /><span style={{ color: 'var(--text3)', fontSize: 11 }}>אצווה: {p.batchQuantity}</span></td>
                    <td>
                      <span style={{ color: 'var(--teal)', fontSize: 12 }}>מכונה: {p.printHours}ש&apos;</span><br />
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>מפעיל: {p.operatorHours}ש&apos;</span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>₪{totalCost.toFixed(1)}</td>
                    <td style={{ color: 'var(--teal)', fontWeight: 700 }}>₪{price.toFixed(1)}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-t btn-sm" onClick={() => editingId === p.id ? cancelEdit() : startEdit(p)}>
                        {editingId === p.id ? 'ביטול' : '✏️'}
                      </button>
                      <button className="btn btn-d btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Form */}
        <form className="card" onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="ch">
            <div className="ct">{editingId ? '✏️ עריכת מוצר' : 'הוסף מוצר'}</div>
            {editingId && <button type="button" onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>ביטול</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>שם המוצר</label>
              <input className="inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="שם..." />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>כמות באצווה</label>
              <input className="inp" type="number" min="1" value={form.batchQuantity} onChange={e => setForm(f => ({ ...f, batchQuantity: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'block' }}>חומרים</label>
              {materials.map((mat, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 28px', gap: 6, marginBottom: 6 }}>
                  <select className="inp" value={mat.inventoryItemId} onChange={e => updateMaterial(i, 'inventoryItemId', e.target.value)}>
                    <option value="">-- בחר --</option>
                    {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
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
                <input className="inp" type="number" min="0" step="0.1" value={form.printHours} onChange={e => setForm(f => ({ ...f, printHours: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>זמן מפעיל (ש&apos;)</label>
                <input className="inp" type="number" min="0" step="0.1" value={form.operatorHours} onChange={e => setForm(f => ({ ...f, operatorHours: e.target.value }))} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>רווח (%)</label>
              <input className="inp" type="number" min="0" max="500" value={form.markup} onChange={e => setForm(f => ({ ...f, markup: e.target.value }))} />
            </div>

            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text2)' }}>עלות ליחידה:</span>
                <span>₪{preview.totalCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: 'var(--text2)' }}>מחיר מומלץ:</span>
                <span style={{ color: 'var(--teal)' }}>₪{preview.price}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-t" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'שומר...' : editingId ? 'שמור שינויים' : '+ הוסף מוצר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
