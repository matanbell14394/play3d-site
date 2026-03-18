'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashStats {
  totalOrders: number; openOrders: number; revenue: number;
  totalUsers: number; inventoryItems: number; unreadContacts: number;
  lowStock: { id: string; name: string; quantity: number; unit: string }[];
  recentOrders: { id: string; clientName: string; status: string; totalPrice: number | null; createdAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', PROCESSING: '#3b82f6', PRINTING: '#8b5cf6',
  READY_FOR_PICKUP: '#10b981', DELIVERED: '#6b7280', CANCELLED: '#ef4444',
};
const STATUS_HE: Record<string, string> = {
  PENDING: 'ממתין', PROCESSING: 'בטיפול', PRINTING: 'מדפיס',
  READY_FOR_PICKUP: 'מוכן', DELIVERED: 'נמסר', CANCELLED: 'בוטל',
};

type WidgetId = 'stats' | 'printer' | 'orders' | 'stock' | 'contacts';

const DEFAULT_WIDGETS: { id: WidgetId; label: string }[] = [
  { id: 'stats',    label: 'סטטיסטיקות' },
  { id: 'printer',  label: 'מצב מדפסת' },
  { id: 'orders',   label: 'הזמנות אחרונות' },
  { id: 'stock',    label: 'מלאי נמוך' },
  { id: 'contacts', label: 'פניות' },
];

const STORAGE_KEY = 'dashboard_layout';

function loadLayout(): { order: WidgetId[]; collapsed: WidgetId[] } {
  if (typeof window === 'undefined') return { order: DEFAULT_WIDGETS.map(w => w.id), collapsed: [] };
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || { order: DEFAULT_WIDGETS.map(w => w.id), collapsed: [] }; }
  catch { return { order: DEFAULT_WIDGETS.map(w => w.id), collapsed: [] }; }
}

interface LivePrinter {
  status: string;
  taskName: string | null;
  progress: number;
  modelImageUrl: string | null;
  modelTitle: string | null;
  updatedAt: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [printerCollapsed, setPrinterCollapsed] = useState(false);
  const [collapsed, setCollapsed] = useState<WidgetId[]>([]);
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_WIDGETS.map(w => w.id));
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'online' | 'offline' | 'printing' | 'paused'>('offline');
  const [livePrinter, setLivePrinter] = useState<LivePrinter | null>(null);
  const [mwUrl, setMwUrl] = useState('');
  const [mwSaving, setMwSaving] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { if (!d.error) setStats(d); });
    const layout = loadLayout();
    if (layout.order?.length) setOrder(layout.order);
    if (layout.collapsed?.length) setCollapsed(layout.collapsed);
    const saved = localStorage.getItem('printer_status');
    if (saved) setPrinterStatus(saved as typeof printerStatus);
    fetch('/api/printer-status').then(r => r.json()).then(d => {
      if (d?.status) { setLivePrinter(d); setMwUrl(d.makerWorldUrl || ''); }
    });
  }, []);

  const saveMakerWorldUrl = async () => {
    setMwSaving(true);
    const res = await fetch('/api/printer-status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ makerWorldUrl: mwUrl }) });
    const d = await res.json();
    if (d?.status) setLivePrinter(d);
    setMwSaving(false);
  };

  const saveLayout = (newOrder: WidgetId[], newCollapsed: WidgetId[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: newOrder, collapsed: newCollapsed }));
  };

  const toggleCollapse = (id: WidgetId) => {
    const next = collapsed.includes(id) ? collapsed.filter(c => c !== id) : [...collapsed, id];
    setCollapsed(next);
    saveLayout(order, next);
  };

  const onDragStart = (id: WidgetId) => setDragging(id);
  const onDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (!dragging || dragging === id) return;
    const arr = [...order];
    const from = arr.indexOf(dragging);
    const to = arr.indexOf(id);
    arr.splice(from, 1); arr.splice(to, 0, dragging);
    setOrder(arr);
  };
  const onDragEnd = () => { setDragging(null); saveLayout(order, collapsed); };

  const printerColors = { online: '#10b981', offline: '#6b7280', printing: '#8b5cf6', paused: '#f59e0b' };
  const printerLabels = { online: 'מחובר', offline: 'לא מחובר', printing: 'מדפיס', paused: 'מושהה' };

  const Widget = ({ id }: { id: WidgetId }) => {
    const isCollapsed = collapsed.includes(id);
    const meta = DEFAULT_WIDGETS.find(w => w.id === id)!;

    const header = (label: string, link?: { href: string; text: string }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)', cursor: editMode ? 'grab' : 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editMode && <span style={{ color: 'var(--text3)', fontSize: 14 }}>⠿</span>}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {link && !isCollapsed && <Link href={link.href} className="btn btn-g btn-sm">{link.text}</Link>}
          <button onClick={() => toggleCollapse(id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text3)', cursor: 'pointer', padding: '2px 8px', fontSize: 13 }}>
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
    );

    if (id === 'stats') return (
      <div className="card" draggable={editMode} onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd} style={{ gridColumn: '1/-1', opacity: dragging === id ? .5 : 1 }}>
        {header(meta.label)}
        {!isCollapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, padding: '0 0 0 0' }}>
            {[
              { lbl: 'הזמנות פתוחות', val: stats?.openOrders ?? '—', color: 'var(--teal)' },
              { lbl: 'הכנסות', val: stats ? `₪${stats.revenue.toFixed(0)}` : '—', color: '#ec4899' },
              { lbl: 'לקוחות', val: stats?.totalUsers ?? '—', color: 'var(--teal)' },
              { lbl: 'פניות חדשות', val: stats?.unreadContacts ?? '—', color: stats?.unreadContacts ? '#f59e0b' : 'var(--text2)' },
            ].map(s => (
              <div key={s.lbl} style={{ padding: '16px 20px', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{s.lbl}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (id === 'printer') return (
      <div className="card" draggable={editMode} onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd} style={{ opacity: dragging === id ? .5 : 1 }}>
        {header(meta.label)}
        {!isCollapsed && (
          <div style={{ padding: 16 }}>
            {/* Live status from bridge */}
            {livePrinter && (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {livePrinter.modelImageUrl && (
                    <img src={livePrinter.modelImageUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: livePrinter.status === 'printing' ? '#10b981' : livePrinter.status === 'paused' ? '#f59e0b' : '#6b7280' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: livePrinter.status === 'printing' ? '#10b981' : livePrinter.status === 'paused' ? '#f59e0b' : 'var(--text3)' }}>
                        {livePrinter.status === 'printing' ? 'מדפיס' : livePrinter.status === 'paused' ? 'מושהה' : livePrinter.status === 'idle' ? 'פנוי' : 'מנותק'}
                      </span>
                      {livePrinter.progress > 0 && <span style={{ fontSize: 12, color: 'var(--teal)', marginRight: 'auto' }}>{livePrinter.progress}%</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {livePrinter.modelTitle || livePrinter.taskName || '—'}
                    </div>
                    {livePrinter.updatedAt && (
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>עודכן {new Date(livePrinter.updatedAt).toLocaleTimeString('he-IL')}</div>
                    )}
                  </div>
                </div>
                {livePrinter.status === 'printing' && livePrinter.progress > 0 && (
                  <div style={{ marginTop: 8, height: 4, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${livePrinter.progress}%`, background: 'linear-gradient(90deg,var(--teal),var(--teal2))', transition: 'width .5s' }} />
                  </div>
                )}
              </div>
            )}

            {/* MakerWorld URL for current model */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>קישור MakerWorld למודל הנוכחי</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={mwUrl} onChange={e => setMwUrl(e.target.value)} placeholder="https://makerworld.com/en/models/..." style={{ flex: 1, padding: '6px 10px', fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontFamily: 'inherit' }} />
                <button onClick={saveMakerWorldUrl} disabled={mwSaving} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--teal)', background: 'var(--teal3)', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: mwSaving ? .6 : 1 }}>
                  {mwSaving ? '...' : 'שמור'}
                </button>
              </div>
            </div>

            {/* Manual status buttons */}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>עדכון ידני (גיבוי)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['online', 'offline', 'printing', 'paused'] as const).map(s => (
                <button key={s} onClick={() => { setPrinterStatus(s); localStorage.setItem('printer_status', s); }}
                  style={{ padding: '7px 0', borderRadius: 7, border: `1px solid ${printerStatus === s ? printerColors[s] : 'var(--border)'}`, background: printerStatus === s ? `${printerColors[s]}22` : 'transparent', color: printerStatus === s ? printerColors[s] : 'var(--text2)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  {printerLabels[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    if (id === 'orders') return (
      <div className="card" draggable={editMode} onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd} style={{ opacity: dragging === id ? .5 : 1 }}>
        {header(meta.label, { href: '/admin/orders', text: 'הכל' })}
        {!isCollapsed && (
          <div style={{ padding: '8px 0' }}>
            {!stats?.recentOrders?.length ? (
              <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>אין הזמנות עדיין</div>
            ) : stats.recentOrders.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{o.clientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(o.createdAt).toLocaleDateString('he-IL')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {o.totalPrice && <span style={{ fontSize: 13, color: 'var(--teal)' }}>₪{o.totalPrice}</span>}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLORS[o.status]}22`, color: STATUS_COLORS[o.status] }}>{STATUS_HE[o.status] || o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (id === 'stock') return (
      <div className="card" draggable={editMode} onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd} style={{ opacity: dragging === id ? .5 : 1 }}>
        {header(meta.label, { href: '/admin/inventory', text: 'מלאי' })}
        {!isCollapsed && (
          <div style={{ padding: '8px 0' }}>
            {!stats?.lowStock?.length ? (
              <div style={{ padding: 16, color: 'var(--text3)', fontSize: 13 }}>כל המלאי תקין ✅</div>
            ) : stats.lowStock.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{item.name}</span>
                <span style={{ fontSize: 13, color: item.quantity < 100 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{item.quantity}{item.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );

    if (id === 'contacts') return (
      <div className="card" draggable={editMode} onDragStart={() => onDragStart(id)} onDragOver={e => onDragOver(e, id)} onDragEnd={onDragEnd} style={{ opacity: dragging === id ? .5 : 1 }}>
        {header(meta.label, { href: '/admin/contacts', text: 'כל הפניות' })}
        {!isCollapsed && (
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32 }}>✉️</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stats?.unreadContacts ? '#f59e0b' : 'var(--text2)' }}>{stats?.unreadContacts ?? 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>פניות שלא נקראו</div>
            </div>
          </div>
        )}
      </div>
    );

    return null;
  };

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>◈</span> לוח בקרה</div>
          <div className="pline" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditMode(e => !e)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${editMode ? 'var(--teal)' : 'var(--border)'}`, background: editMode ? 'var(--teal3)' : 'transparent', color: editMode ? 'var(--teal)' : 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>
            {editMode ? '✓ שמור סידור' : '⚙ ערוך מסך'}
          </button>
          <Link href="/admin/orders" className="btn btn-t btn-sm">+ הזמנה</Link>
        </div>
      </div>

      {editMode && (
        <div style={{ background: 'rgba(0,229,204,.07)', border: '1px solid var(--teal)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--teal)' }}>
          ⠿ גרור ויג&apos;טים לסידור מחדש • לחץ ▲▼ לכיווץ/פתיחה
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {order.map(id => <Widget key={id} id={id} />)}
      </div>
    </div>
  );
}
