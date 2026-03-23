'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SiteNav from '@/components/SiteNav';
import Link from 'next/link';

type Step = 1 | 2 | 3;

interface FormData {
  name: string; email: string; phone: string; city: string;
  printType: string; quantity: number; description: string; modelUrl: string;
}

const PRINT_TYPES = ['FDM — PLA', 'FDM — PETG', 'FDM — ABS', 'FDM — TPU', 'FDM — ASA', 'לא בטוח — ייעץ לי'];

export default function OrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/order');
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>טוען...</div>
  );

  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: '', email: '', phone: '', city: '',
    printType: '', quantity: 1, description: '', modelUrl: '',
  });

  const set = (k: keyof FormData, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const step1Valid = !!(form.name && form.email && form.phone);
  const step2Valid = form.quantity >= 1 && !!form.description;

  const submit = async () => setSubmitted(true);

  if (submitted) return (
    <>
      <SiteNav />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, direction: 'rtl' }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>ההזמנה נשלחה!</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 32 }}>נחזור אליך תוך 24 שעות עם אישור והערכת מחיר.</p>
          <Link href="/" className="btn-hero" style={{ display: 'inline-block' }}>חזרה לדף הבית</Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ minHeight: '100vh', padding: '100px 24px 60px', direction: 'rtl' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 10 }}>// הזמנת הדפסה</div>
            <h1 className="sh-title">הגש הזמנה</h1>
            <div className="sh-line" style={{ margin: '10px auto 0' }} />
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 40, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 20, right: '16.6%', left: '16.6%', height: 2, background: 'var(--border)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 20, right: '16.6%', width: `${(step - 1) * 50}%`, height: 2, background: 'var(--teal)', zIndex: 1, transition: 'width .4s' }} />
            {([{ n: 1, label: 'פרטים אישיים' }, { n: 2, label: 'פרטי הפרויקט' }, { n: 3, label: 'סיכום ושליחה' }] as const).map(s => (
              <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: step >= s.n ? 'var(--teal)' : 'var(--bg3)', border: `2px solid ${step >= s.n ? 'var(--teal)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: step >= s.n ? '#000' : 'var(--text3)', transition: 'all .3s' }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <div style={{ fontSize: 11, color: step === s.n ? 'var(--teal)' : 'var(--text3)', fontWeight: step === s.n ? 700 : 400, textAlign: 'center' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: 'var(--teal)' }}>שלב 1 — הפרטים שלך</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="fg"><label htmlFor="o-name">שם מלא *</label><input id="o-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ישראל ישראלי" /></div>
                <div className="fg"><label htmlFor="o-email">אימייל *</label><input id="o-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" /></div>
                <div className="fg"><label htmlFor="o-phone">טלפון *</label><input id="o-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="050-0000000" /></div>
                <div className="fg"><label htmlFor="o-city">עיר / ישוב</label><input id="o-city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="תל אביב" /></div>
              </div>
              <button onClick={() => setStep(2)} disabled={!step1Valid} style={{ marginTop: 24, width: '100%', padding: '13px 0', borderRadius: 10, background: step1Valid ? 'var(--teal)' : 'var(--bg3)', border: 'none', color: step1Valid ? '#000' : 'var(--text3)', fontSize: 15, fontWeight: 700, cursor: step1Valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all .2s' }}>
                המשך לשלב הבא ←
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: 'var(--teal)' }}>שלב 2 — פרטי הפרויקט</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                <div className="fg">
                  <label htmlFor="o-type">סוג הדפסה</label>
                  <select id="o-type" value={form.printType} onChange={e => set('printType', e.target.value)}>
                    <option value="">— בחר חומר —</option>
                    {PRINT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg"><label htmlFor="o-qty">כמות *</label><input id="o-qty" type="number" min={1} value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 1)} /></div>
                <div className="fg"><label htmlFor="o-file">קובץ STL / 3MF</label><input id="o-file" type="file" accept=".stl,.obj,.3mf" style={{ padding: '8px 12px' }} /></div>
                <div className="fg"><label htmlFor="o-url">קישור מ-MakerWorld (אופציונלי)</label><input id="o-url" value={form.modelUrl} onChange={e => set('modelUrl', e.target.value)} placeholder="https://makerworld.com/en/models/..." /></div>
                <div className="fg"><label htmlFor="o-desc">תיאור הפרויקט *</label><textarea id="o-desc" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 100 }} placeholder="גודל, שימוש, צבע, רמת דיוק..." /></div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>← חזור</button>
                <button onClick={() => setStep(3)} disabled={!step2Valid} style={{ flex: 1, padding: '12px 0', borderRadius: 10, background: step2Valid ? 'var(--teal)' : 'var(--bg3)', border: 'none', color: step2Valid ? '#000' : 'var(--text3)', fontSize: 15, fontWeight: 700, cursor: step2Valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all .2s' }}>
                  המשך לסיכום ←
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: 'var(--teal)' }}>שלב 3 — סיכום ואישור</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  ['שם', form.name], ['אימייל', form.email], ['טלפון', form.phone],
                  ['עיר', form.city || '—'], ['חומר', form.printType || '—'], ['כמות', String(form.quantity)],
                  ['קישור', form.modelUrl || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 14 }}>
                    <span style={{ color: 'var(--text3)' }}>{label}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600, maxWidth: '60%', textAlign: 'left', wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
                {form.description && (
                  <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 14 }}>
                    <div style={{ color: 'var(--text3)', marginBottom: 6 }}>תיאור</div>
                    <div style={{ color: 'var(--text)', lineHeight: 1.6 }}>{form.description}</div>
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,229,204,.08)', border: '1px solid rgba(0,229,204,.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
                💡 לאחר השליחה, נחזור אליך תוך 24 שעות עם הצעת מחיר ואישור.
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(2)} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>← חזור</button>
                <button onClick={submit} style={{ flex: 1, padding: '13px 0', borderRadius: 10, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🚀 שלח הזמנה
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
