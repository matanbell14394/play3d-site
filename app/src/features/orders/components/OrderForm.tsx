"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, CreateOrderDto } from "../validators/orderValidators";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(createOrderSchema),
  });

  const onSubmit = async (data: CreateOrderDto) => {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    setIsSubmitting(false);

    if (response.ok) {
      router.push("/order/success");
    } else {
      const result = await response.json();
      setError(result.error?.message || "אירעה שגיאה בלתי צפויה.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-grid">
        <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--teal)', letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 4, borderBottom: '1px solid rgba(0,229,204,.1)', marginBottom: 4 }}>
          פרטי לקוח
        </div>

        <div className="fg">
          <label htmlFor="clientName">שם מלא *</label>
          <input id="clientName" placeholder="ישראל ישראלי" {...register("clientName")} />
          {errors.clientName && <span style={{ fontSize: 11, color: 'var(--pink)' }}>{String(errors.clientName.message)}</span>}
        </div>

        <div className="fg">
          <label htmlFor="clientPhone">טלפון *</label>
          <input id="clientPhone" placeholder="050-0000000" {...register("clientPhone")} />
          {errors.clientPhone && <span style={{ fontSize: 11, color: 'var(--pink)' }}>{String(errors.clientPhone.message)}</span>}
        </div>

        <div style={{ gridColumn: '1/-1', fontSize: 10, color: 'var(--teal)', letterSpacing: 2, textTransform: 'uppercase', paddingBottom: 4, borderBottom: '1px solid rgba(0,229,204,.1)', marginTop: 8 }}>
          קובץ STL
        </div>

        <div className="fg">
          <label htmlFor="stlUrl">כתובת URL לקובץ STL</label>
          <input id="stlUrl" placeholder="https://www.thingiverse.com/thing:..." {...register("stlUrl")} />
          {errors.stlUrl && <span style={{ fontSize: 11, color: 'var(--pink)' }}>{String(errors.stlUrl.message)}</span>}
        </div>

        <div className="fg">
          <label htmlFor="quantity">כמות</label>
          <input id="quantity" type="number" min="1" {...register("quantity")} />
          {errors.quantity && <span style={{ fontSize: 11, color: 'var(--pink)' }}>{String(errors.quantity.message)}</span>}
        </div>

        <div className="fg" style={{ gridColumn: '1/-1' }}>
          <label htmlFor="stlFile">או העלה קובץ .STL</label>
          <input id="stlFile" type="file" accept=".stl" style={{ padding: '8px 12px' }} {...register("stlFile")} />
          {errors.stlFile && <span style={{ fontSize: 11, color: 'var(--pink)' }}>{errors.stlFile.message?.toString()}</span>}
        </div>

        <div className="fg full">
          <label htmlFor="notes">הערות (אופציונלי)</label>
          <textarea id="notes" placeholder="גודל, צבע, שימוש, רמת פינוי..." {...register("notes")} />
        </div>

        {error && (
          <div style={{ gridColumn: '1/-1', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,45,120,.08)', border: '1px solid rgba(255,45,120,.2)', color: 'var(--pink)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="submit-btn-big"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "שולח..." : "🚀 שלח הזמנה"}
        </button>
      </div>
    </form>
  );
}
