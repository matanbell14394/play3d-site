'use client';

import { useState, useEffect } from 'react';

const DEFAULTS = {
  businessName: 'PLAY3D',
  businessPhone: '',
  businessEmail: '',
  operatorRate: '50',
  machineRate: '5',
  defaultMarkup: '30',
  currency: '₪',
  slicerType: 'bambu',
  slicerApiUrl: '',
  slicerApiKey: '',
  minOrderPrice: '50',
  vatPercent: '18',
};

type Settings = typeof DEFAULTS;

const SLICER_OPTIONS = [
  { value: 'bambu', label: 'Bambu Lab (Bambu Studio)' },
  { value: 'prusa', label: 'Prusa Slicer' },
  { value: 'cura', label: 'Ultimaker Cura' },
  { value: 'orca', label: 'OrcaSlicer' },
  { value: 'manual', label: 'ידני (ללא חיבור)' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'pricing' | 'slicer'>('business');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(s => ({ ...s, ...data }));
      setLoading(false);
    });
  }, []);

  const set = (key: keyof Settings, val: string) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>טוען הגדרות...</div>;

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ptitle"><span>⚙</span> הגדרות מערכת</div>
          <div className="pline" />
        </div>
        <button className="btn btn-t" onClick={handleSave} disabled={saving}>
          {saved ? '✓ נשמר!' : saving ? 'שומר...' : 'שמור הגדרות'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'business', label: '🏢 פרטי עסק' },
          { key: 'pricing', label: '₪ תמחור' },
          { key: 'slicer', label: '⚙ סלייסר' },
        ].map(t => (
          <button key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key as typeof activeTab)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="card" style={{ padding: 28 }}>
          <div className="ch" style={{ marginBottom: 20 }}><div className="ct">פרטי העסק</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>שם העסק</label>
              <input className="inp" value={settings.businessName} onChange={e => set('businessName', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>טלפון</label>
              <input className="inp" value={settings.businessPhone} onChange={e => set('businessPhone', e.target.value)} placeholder="050-1234567" />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>אימייל</label>
              <input className="inp" type="email" value={settings.businessEmail} onChange={e => set('businessEmail', e.target.value)} placeholder="admin@play3d.co.il" />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>מטבע</label>
              <select className="inp" value={settings.currency} onChange={e => set('currency', e.target.value)}>
                <option value="₪">שקל (₪)</option>
                <option value="$">דולר ($)</option>
                <option value="€">אירו (€)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="card" style={{ padding: 28 }}>
          <div className="ch" style={{ marginBottom: 20 }}><div className="ct">הגדרות תמחור</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>עלות שעת מפעיל (₪/ש&apos;)</label>
              <input className="inp" type="number" min="0" value={settings.operatorRate} onChange={e => set('operatorRate', e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>כמה שוה שעת עבודה שלך</div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>עלות שעת מכונה (₪/ש&apos;)</label>
              <input className="inp" type="number" min="0" value={settings.machineRate} onChange={e => set('machineRate', e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>חשמל + פחת מכונה</div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>מארקאפ ברירת מחדל (%)</label>
              <input className="inp" type="number" min="0" max="500" value={settings.defaultMarkup} onChange={e => set('defaultMarkup', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>מע&quot;מ (%)</label>
              <input className="inp" type="number" min="0" max="100" value={settings.vatPercent} onChange={e => set('vatPercent', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>מחיר הזמנה מינימלי (₪)</label>
              <input className="inp" type="number" min="0" value={settings.minOrderPrice} onChange={e => set('minOrderPrice', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'slicer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 28 }}>
            <div className="ch" style={{ marginBottom: 20 }}><div className="ct">🖨️ חיבור לסלייסר</div></div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
              חבר את הסלייסר שלך כדי לקבל אוטומטית זמן הדפסה, כמות חומר ועלות מדויקת לכל מוצר.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>סוג הסלייסר</label>
                <select className="inp" value={settings.slicerType} onChange={e => set('slicerType', e.target.value)}>
                  {SLICER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {settings.slicerType !== 'manual' && (
                <>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>כתובת API של הסלייסר</label>
                    <input className="inp" value={settings.slicerApiUrl} onChange={e => set('slicerApiUrl', e.target.value)} placeholder="http://192.168.1.x:7125" />
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      {settings.slicerType === 'bambu' && 'כתובת ה-IP של ה-Bambu printer בממשק המקומי'}
                      {settings.slicerType === 'prusa' && 'Prusa Connect URL'}
                      {settings.slicerType === 'orca' && 'OrcaSlicer Remote API URL'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>מפתח API</label>
                    <input className="inp" type="password" value={settings.slicerApiKey} onChange={e => set('slicerApiKey', e.target.value)} placeholder="api key..." />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <div className="ch" style={{ marginBottom: 16 }}><div className="ct">📄 זיהוי מסלייסר — קובץ G-Code</div></div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
              העלה קובץ G-Code (.gcode) מהסלייסר שלך — המערכת תחלץ אוטומטית את זמן ההדפסה וכמות החומר.
            </div>
            <GcodeParser />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface FilamentSlot {
  slot: number;
  type: string;
  color: string;
  weightG: number;
  lengthMm: number;
  inventoryItemId: string;
}

interface ParseResult {
  printTime: string;
  printTimeSecs: number;
  slots: FilamentSlot[];
  slicer: string;
}

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  price: number;
}

// ─── Parser logic ─────────────────────────────────────────────────────────────
function parseGcode(text: string): ParseResult {
  const lines = text.split('\n');
  let printTime = '';
  let printTimeSecs = 0;
  let slicer = 'unknown';
  const slots: FilamentSlot[] = [];

  // Detect slicer
  for (const line of lines.slice(0, 30)) {
    if (line.includes('BambuStudio') || line.includes('bambu')) slicer = 'bambu';
    else if (line.includes('PrusaSlicer')) slicer = 'prusa';
    else if (line.includes('OrcaSlicer')) slicer = 'orca';
    else if (line.includes('Cura')) slicer = 'cura';
  }

  // ── Bambu Studio ────────────────────────────────────────────────────────────
  if (slicer === 'bambu') {
    let weightsG: number[] = [];
    let types: string[] = [];
    let colors: string[] = [];
    let lengthsMm: number[] = [];

    for (const line of lines) {
      if (line.startsWith('; filament used [g]')) {
        weightsG = line.split('=')[1]?.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)) ?? [];
      }
      if (line.startsWith('; filament used [mm]')) {
        lengthsMm = line.split('=')[1]?.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)) ?? [];
      }
      if (line.startsWith('; filament_type')) {
        types = line.split('=')[1]?.split(';').map(v => v.trim()) ?? [];
      }
      if (line.startsWith('; filament_colour') || line.startsWith('; filament_color')) {
        colors = line.split('=')[1]?.split(';').map(v => v.trim()) ?? [];
      }
      if (line.includes('total estimated time') || line.includes('total printing time')) {
        printTime = line.split(':').slice(1).join(':').trim();
      }
    }

    weightsG.forEach((w, i) => {
      if (w > 0) {
        slots.push({
          slot: i + 1,
          type: types[i] ?? 'PLA',
          color: colors[i] ?? '#888888',
          weightG: w,
          lengthMm: lengthsMm[i] ?? 0,
          inventoryItemId: '',
        });
      }
    });
  }

  // ── PrusaSlicer / OrcaSlicer ────────────────────────────────────────────────
  if (slicer === 'prusa' || slicer === 'orca' || slicer === 'unknown') {
    let weightsG: number[] = [];
    let types: string[] = [];
    let lengthsMm: number[] = [];

    for (const line of lines) {
      if (line.includes('filament used [g]') && line.includes('=')) {
        weightsG = line.split('=')[1]?.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)) ?? [];
      }
      if (line.includes('filament used [mm]') && line.includes('=')) {
        lengthsMm = line.split('=')[1]?.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)) ?? [];
      }
      if (line.includes('filament_type') && line.includes('=')) {
        types = line.split('=')[1]?.split(';').map(v => v.trim()) ?? [];
      }
      if (line.includes('estimated printing time') && !printTime) {
        printTime = line.split('=')[1]?.trim() ?? '';
      }
    }

    if (weightsG.length > 0) {
      if (slicer === 'unknown') slicer = 'prusa';
      weightsG.forEach((w, i) => {
        if (w > 0) {
          slots.push({
            slot: i + 1,
            type: types[i] ?? 'PLA',
            color: '#888888',
            weightG: w,
            lengthMm: lengthsMm[i] ?? 0,
            inventoryItemId: '',
          });
        }
      });
    }
  }

  // ── Cura (single material) ───────────────────────────────────────────────────
  if (slicer === 'cura' || (slots.length === 0)) {
    let weightG = 0;
    let lengthMm = 0;
    for (const line of lines) {
      if (line.startsWith(';TIME:')) {
        const secs = parseInt(line.replace(';TIME:', '').trim());
        if (!isNaN(secs)) {
          printTimeSecs = secs;
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          printTime = `${h}ש' ${m}ד'`;
        }
      }
      if (line.startsWith(';Filament used:')) {
        const val = parseFloat(line.replace(';Filament used:', '').replace('m', '').trim());
        if (!isNaN(val)) lengthMm = val * 1000;
      }
      if (line.startsWith(';FILAMENT_WEIGHT:')) {
        const val = parseFloat(line.replace(';FILAMENT_WEIGHT:', '').trim());
        if (!isNaN(val)) weightG = val;
      }
    }
    if (weightG > 0 || lengthMm > 0) {
      slots.push({ slot: 1, type: 'PLA', color: '#888888', weightG, lengthMm, inventoryItemId: '' });
    }
  }

  // Convert printTime string → secs if not already done
  if (!printTimeSecs && printTime) {
    const hMatch = printTime.match(/(\d+)h/);
    const mMatch = printTime.match(/(\d+)m/);
    printTimeSecs = (hMatch ? parseInt(hMatch[1]) * 3600 : 0) + (mMatch ? parseInt(mMatch[1]) * 60 : 0);
  }

  return { printTime: printTime || 'לא זוהה', printTimeSecs, slots, slicer };
}

// ─── Component ────────────────────────────────────────────────────────────────
function GcodeParser() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [slots, setSlots] = useState<FilamentSlot[]>([]);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [deducting, setDeducting] = useState(false);
  const [deductResult, setDeductResult] = useState<string>('');

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(d => setInventory(Array.isArray(d) ? d : []));
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    setResult(null);
    setDeductResult('');

    const text = await file.text();
    const parsed = parseGcode(text);
    setParsing(false);

    if (parsed.slots.length === 0 && !parsed.printTime) {
      setError('לא נמצא מידע. ודא שהקובץ הוא G-Code עם הערות סלייסר.');
      return;
    }

    setResult(parsed);
    setSlots(parsed.slots);
  };

  const updateSlotMapping = (slotIdx: number, inventoryItemId: string) => {
    setSlots(s => s.map((sl, i) => i === slotIdx ? { ...sl, inventoryItemId } : sl));
  };

  const calcSlotCost = (sl: FilamentSlot) => {
    const inv = inventory.find(i => i.id === sl.inventoryItemId);
    if (!inv) return 0;
    // price is per unit (g or ml), weightG is in grams
    return inv.price * sl.weightG;
  };

  const totalCost = slots.reduce((sum, sl) => sum + calcSlotCost(sl), 0);

  const handleDeduct = async () => {
    const toDeduct = slots.filter(sl => sl.inventoryItemId && sl.weightG > 0);
    if (toDeduct.length === 0) {
      setError('לא נבחרו פריטי מלאי לניכוי');
      return;
    }
    setDeducting(true);
    const res = await fetch('/api/inventory/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: toDeduct.map(sl => ({ inventoryItemId: sl.inventoryItemId, amountUsed: sl.weightG })),
      }),
    });
    const data = await res.json();
    setDeducting(false);
    if (data.ok) {
      const summary = data.results.map((r: { name: string; deducted: number; after: number }) =>
        `${r.name}: -${r.deducted.toFixed(1)}g → נשאר ${r.after.toFixed(1)}g`
      ).join(' | ');
      setDeductResult(summary);
    } else {
      setError('שגיאה בניכוי מלאי');
    }
  };

  const SLICER_NAMES: Record<string, string> = {
    bambu: '🖨️ Bambu Studio',
    prusa: '🦙 PrusaSlicer',
    orca: '🐋 OrcaSlicer',
    cura: '⚡ Cura',
    unknown: '❓ לא זוהה',
  };

  return (
    <div>
      {/* Upload zone */}
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        gap: 10, border: '2px dashed var(--border)', borderRadius: 12, padding: 32,
        cursor: 'pointer', color: 'var(--text2)', transition: 'border-color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <span style={{ fontSize: 36 }}>📁</span>
        <span style={{ fontSize: 15 }}>{parsing ? '⏳ מעבד קובץ...' : 'לחץ להעלאת קובץ G-Code'}</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Bambu · PrusaSlicer · OrcaSlicer · Cura — כולל הדפסה צבעונית עם AMS/MMU</span>
        <input type="file" accept=".gcode,.gco,.g" onChange={handleFile} style={{ display: 'none' }} />
      </label>

      {error && <div style={{ color: 'var(--pink)', fontSize: 13, marginTop: 12, padding: '10px 14px', background: 'var(--pink2)', borderRadius: 8 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 20 }}>
          {/* Header info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>סלייסר</div>
              <div style={{ fontWeight: 700 }}>{SLICER_NAMES[result.slicer] ?? result.slicer}</div>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>זמן הדפסה</div>
              <div style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 16 }}>{result.printTime}</div>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>מספר חומרים</div>
              <div style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 16 }}>{slots.length}</div>
            </div>
          </div>

          {/* Per-slot table */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>
              חומרים לפי Slot — מפה למלאי שלך
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 11, color: 'var(--text2)' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>Slot</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>סוג</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>גרם</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>אורך</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>מלאי ←</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right', borderBottom: '1px solid var(--border2)' }}>עלות</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((sl, i) => {
                  const cost = calcSlotCost(sl);
                  return (
                    <tr key={i}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, borderRadius: 6,
                          background: sl.color !== '#888888' ? sl.color + '33' : 'var(--teal3)',
                          border: `2px solid ${sl.color !== '#888888' ? sl.color : 'var(--teal)'}`,
                          fontSize: 11, fontWeight: 700, color: 'var(--text)',
                        }}>
                          {sl.slot}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', color: 'var(--teal)', fontWeight: 600 }}>{sl.type}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', fontWeight: 700 }}>{sl.weightG.toFixed(1)}g</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12 }}>
                        {sl.lengthMm > 0 ? `${(sl.lengthMm / 1000).toFixed(2)}m` : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border2)' }}>
                        <select
                          className="inp"
                          value={sl.inventoryItemId}
                          onChange={e => updateSlotMapping(i, e.target.value)}
                          style={{ fontSize: 12, padding: '5px 8px' }}
                        >
                          <option value="">-- בחר חומר --</option>
                          {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border2)', color: cost > 0 ? 'var(--teal)' : 'var(--text3)', fontWeight: 600 }}>
                        {cost > 0 ? `₪${cost.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalCost > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>סה&quot;כ עלות חומרים:</td>
                    <td style={{ padding: '10px 14px', color: 'var(--teal)', fontWeight: 700, fontSize: 16 }}>₪{totalCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Deduct button */}
          <button
            className="btn btn-p"
            onClick={handleDeduct}
            disabled={deducting || slots.every(s => !s.inventoryItemId)}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}
          >
            {deducting ? '⏳ מנכה מהמלאי...' : '📦 נכה כמויות מהמלאי'}
          </button>

          {deductResult && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(0,238,221,0.08)', border: '1px solid var(--teal-glow)', borderRadius: 10, fontSize: 13, color: 'var(--teal)' }}>
              ✅ {deductResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
