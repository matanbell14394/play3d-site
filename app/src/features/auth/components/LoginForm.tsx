"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginDto } from "../validators/authValidators";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginDto) => {
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("אימייל או סיסמה שגויים. נסה שוב.");
    } else if (result?.ok) {
      router.push(callbackUrl || "/admin/dashboard");
    }
  };

  return (
    <div style={{ width: 360, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 36, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -70, right: -70, width: 200, height: 200, background: 'radial-gradient(circle,rgba(0,229,204,.1),transparent)', borderRadius: '50%' }} />
      <div style={{ textAlign: 'center', marginBottom: 5, fontFamily: 'var(--font-orbitron), monospace', fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg,var(--teal),var(--pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 3, position: 'relative', zIndex: 1 }}>
        PLAY3D
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', letterSpacing: 3, marginBottom: 24, textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>
        ADMIN PANEL
      </div>
      <form onSubmit={handleSubmit(onSubmit)} style={{ position: 'relative', zIndex: 1 }}>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>אימייל</label>
          <input id="email" type="email" autoComplete="off" {...register("email")} />
          {errors.email && <p style={{ color: 'var(--pink)', fontSize: 11, marginTop: 3 }}>{errors.email.message}</p>}
        </div>
        <div className="fg" style={{ marginBottom: 14 }}>
          <label>סיסמה</label>
          <input id="password" type="password" {...register("password")} />
          {errors.password && <p style={{ color: 'var(--pink)', fontSize: 11, marginTop: 3 }}>{errors.password.message}</p>}
        </div>
        {error && <p style={{ color: 'var(--pink)', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: 12, borderRadius: 10, background: 'linear-gradient(135deg,var(--teal),var(--teal2))', border: 'none', color: 'var(--bg)', fontSize: 14, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
