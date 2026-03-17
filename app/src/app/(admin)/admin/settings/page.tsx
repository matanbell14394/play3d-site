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

function GcodeParser() {
  const [result, setResult] = useState<{ printTime?: string; material?: string; weight?: string } | null>(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    setResult(null);

    const text = await file.text();
    const lines = text.split('\n');

    // Parse common slicer comment formats
    let printTime = '';
    let material = '';
    let weight = '';

    for (const line of lines) {
      // PrusaSlicer / OrcaSlicer
      if (line.includes('estimated printing time')) {
        printTime = line.split('=')[1]?.trim() || line.split(':')[1]?.trim() || '';
      }
      if (line.includes('total filament used')) {
        material = line.split('=')[1]?.trim() || '';
      }
      if (line.includes('total filament weight')) {
        weight = line.split('=')[1]?.trim() || '';
      }
      // Bambu
      if (line.includes('; total estimated time:')) {
        printTime = line.replace('; total estimated time:', '').trim();
      }
      if (line.includes('; total filament weight')) {
        weight = line.split('=')[1]?.trim() || '';
      }
      // Cura
      if (line.includes(';TIME:')) {
        const secs = parseInt(line.replace(';TIME:', '').trim());
        if (!isNaN(secs)) {
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          printTime = `${h}ש' ${m}ד'`;
        }
      }
      if (line.includes(';Filament used:')) {
        material = line.replace(';Filament used:', '').trim();
      }
    }

    setParsing(false);
    if (!printTime && !material && !weight) {
      setError('לא נמצא מידע בקובץ. ודא שמדובר בקובץ G-Code תקין עם הערות מהסלייסר.');
      return;
    }
    setResult({ printTime: printTime || 'לא זוהה', material: material || 'לא זוהה', weight: weight || 'לא זוהה' });
  };

  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        gap: 10, border: '2px dashed var(--border)', borderRadius: 12, padding: 32,
        cursor: 'pointer', color: 'var(--text2)', transition: 'border-color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <span style={{ fontSize: 32 }}>📁</span>
        <span>{parsing ? 'מעבד קובץ...' : 'לחץ להעלאת קובץ G-Code'}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>תומך ב-PrusaSlicer, OrcaSlicer, Cura, Bambu Studio</span>
        <input type="file" accept=".gcode,.gco,.g" onChange={handleFile} style={{ display: 'none' }} />
      </label>

      {error && <div style={{ color: 'var(--pink)', fontSize: 13, marginTop: 12, padding: '10px 14px', background: 'var(--pink2)', borderRadius: 8 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 16, background: 'var(--bg3)', borderRadius: 12, padding: 20, border: '1px solid var(--teal-glow)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>זמן הדפסה</div>
            <div style={{ color: 'var(--teal)', fontWeight: 700 }}>{result.printTime}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>חומר (מטר)</div>
            <div style={{ color: 'var(--teal)', fontWeight: 700 }}>{result.material}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>משקל (גרם)</div>
            <div style={{ color: 'var(--teal)', fontWeight: 700 }}>{result.weight}</div>
          </div>
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
            העתק את הנתונים לטופס המוצר בדף תימחור ומוצרים
          </div>
        </div>
      )}
    </div>
  );
}
