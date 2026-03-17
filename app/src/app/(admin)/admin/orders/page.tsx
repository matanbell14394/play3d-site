'use client';

import { useState, useEffect, useCallback } from 'react';

interface User { id: string; name: string | null; email: string; }
interface Product { id: string; name: string; }
interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  notes: string | null;
  quantity: number;
  totalPrice: number | null;
  status: string;
  createdAt: string;
  user: User;
  product: Product | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'ממתין', PROCESSING: 'בעיבוד', PRINTING: 'בהדפסה',
  READY_FOR_PICKUP: 'מוכן', DELIVERED: 'נמסר', CANCELLED: 'בוטל',
  ON_HOLD: 'בהמתנה', FAILED: 'נכשל',
};
const STATUS_BADGE: Record<string, string> = {
  PENDING: 'by', PROCESSING: 'bt', PRINTING: 'bt',
  READY_FOR_PICKUP: 'bgn', DELIVERED: 'bg_', CANCELLED: 'br',
  ON_HOLD: 'bp', FAILED: 'br',
};
const TABS = ['הכל', 'ממתין', 'בהדפסה', 'מוכן', 'נמסר', 'בוטל'];
const TAB_STATUS: Record<string, string | null> = {
  'הכל': null, 'ממתין': 'PENDING', 'בהדפסה': 'PRINTING',
  'מוכן': 'READY_FOR_PICKUP', 'נמסר': 'DELIVERED', 'בוטל': 'CANCELLED',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('הכל');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [userId, setUserId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [totalPrice, setTotalPrice] = useState('');
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState('PENDING');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [o, u, p] = await Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setUsers(Array.isArray(u) ? u : []);
    setProducts(Array.isArray(p) ? p : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-fill name/phone when user is selected
  const handleUserChange = (uid: string) => {
    setUserId(uid);
    const u = users.find(u => u.id === uid);
    if (u) setClientName(u.name ?? u.email.split('@')[0]);
  };

  const resetForm = () => {
    setUserId(''); setClientName(''); setClientPhone(''); setNotes('');
    setQuantity('1'); setTotalPrice(''); setProductId(''); setStatus('PENDING');
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, clientName, clientPhone, notes, quantity, totalPrice, productId, status }),
    });
    setSaving(false);
    setShowForm(false);
    fetchAll();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setOrders(o => o.map(ord => ord.id === id ? { ...ord, status: newStatus } : ord));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק הזמנה זו?')) return;
    await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const filtered = activeTab === 'הכל' ? orders
    : orders.filter(o => o.status === TAB_STATUS[activeTab]);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>◎</span> הזמנות</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t btn-sm" onClick={openNew}>+ הזמנה חדשה</button>
      </div>

      {/* Stats */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="sc"><div className="slbl">סה"כ</div><div className="sval">{orders.length}</div></div>
        <div className="sc"><div className="slbl">ממתינות</div><div className="sval" style={{ color: 'var(--gold)' }}>{orders.filter(o => o.status === 'PENDING').length}</div></div>
        <div className="sc"><div className="slbl">בהדפסה</div><div className="sval">{orders.filter(o => o.status === 'PRINTING').length}</div></div>
        <div className="sc pk"><div className="slbl">נמסרו</div><div className="sval">{orders.filter(o => o.status === 'DELIVERED').length}</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>לקוח</th>
              <th>טלפון</th>
              <th>מוצר</th>
              <th>כמות</th>
              <th>מחיר</th>
              <th>סטטוס</th>
              <th>תאריך</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--text2)' }}>טוען...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--text3)' }}>אין הזמנות</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id}>
                <td>
                  <strong>{o.clientName}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.user.email}</div>
                </td>
                <td style={{ color: 'var(--text2)' }}>{o.clientPhone || '—'}</td>
                <td>{o.product?.name ?? <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                <td style={{ textAlign: 'center' }}>{o.quantity}</td>
                <td>{o.totalPrice ? `₪${o.totalPrice}` : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                <td>
                  <select
                    className="ss"
                    value={o.status}
                    onChange={e => handleStatusChange(o.id, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </td>
                <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                  {new Date(o.createdAt).toLocaleDateString('he-IL')}
                </td>
                <td>
                  <button className="btn btn-d btn-sm" onClick={() => handleDelete(o.id)}>מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Order Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="ct" style={{ fontSize: 15 }}>הזמנה חדשה</div>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 22 }}>✕</button>
            </div>

            {/* User selector */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>משתמש *</label>
              <select className="inp" value={userId} onChange={e => handleUserChange(e.target.value)} required>
                <option value="">-- בחר משתמש --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.email})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>שם לקוח *</label>
                <input className="inp" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="שם מלא" />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>טלפון</label>
                <input className="inp" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="050-0000000" />
              </div>
            </div>

            {/* Product selector */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>מוצר (אופציונלי)</label>
              <select className="inp" value={productId} onChange={e => setProductId(e.target.value)}>
                <option value="">-- ללא מוצר ספציפי --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>כמות</label>
                <input className="inp" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>מחיר כולל (₪)</label>
                <input className="inp" type="number" min="0" step="0.01" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>סטטוס</label>
              <select className="inp" value={status} onChange={e => setStatus(e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>הערות</label>
              <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="הערות להזמנה..." style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-t" disabled={saving || !userId} style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>
              {saving ? 'יוצר...' : '+ צור הזמנה'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
