'use client';

import SiteNav from '@/components/SiteNav';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      <div className="grid-bg" />
      <SiteNav />

      <main
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 40px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <style>{`
          @keyframes moveNozzle {
            0%, 100% { transform: translateX(-60px); }
            50% { transform: translateX(60px); }
          }
          .nozzle-carriage {
            animation: moveNozzle 4s ease-in-out infinite;
          }
          @keyframes textGlow {
            0%, 100% { filter: drop-shadow(0 0 8px rgba(0, 240, 224, 0.4)) drop-shadow(0 0 20px rgba(0, 240, 224, 0.2)); }
            50% { filter: drop-shadow(0 0 12px rgba(255, 64, 144, 0.4)) drop-shadow(0 0 25px rgba(255, 64, 144, 0.2)); }
          }
          .glow-text {
            animation: textGlow 3s ease-in-out infinite;
          }
        `}</style>

        <div className="orb orb1" style={{ top: '20%', left: '10%', opacity: 0.15 }} />
        <div className="orb orb2" style={{ bottom: '20%', right: '10%', opacity: 0.15 }} />

        <div
          className="card"
          style={{
            maxWidth: 600,
            width: '100%',
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(15, 20, 38, 0.75)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Animated 3D Printer Nozzle and 404 */}
          <svg
            viewBox="0 0 400 220"
            width="100%"
            height="220"
            style={{ maxWidth: 400, margin: '0 auto 16px', display: 'block', overflow: 'visible' }}
          >
            {/* 3D Grid Bed */}
            <path d="M 50 160 L 350 160 L 380 200 L 20 200 Z" fill="none" stroke="var(--border)" strokeWidth="1" opacity="0.6" />
            <path d="M 90 160 L 60 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 130 160 L 110 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 170 160 L 160 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 210 160 L 210 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 250 160 L 260 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 290 160 L 310 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 330 160 L 360 200" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />

            {/* The Printed 404 */}
            <text
              x="50%"
              y="135"
              textAnchor="middle"
              fontSize="100"
              fontWeight="900"
              fontFamily="var(--font-orbitron), sans-serif"
              fill="none"
              stroke="url(#neonGradient)"
              strokeWidth="3.5"
              className="glow-text"
            >
              404
            </text>

            <defs>
              <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--teal)" />
                <stop offset="100%" stopColor="var(--pink)" />
              </linearGradient>
            </defs>

            {/* Guide Rail */}
            <line x1="10" y1="40" x2="390" y2="40" stroke="var(--border2)" strokeWidth="4" />
            
            {/* Extruder Nozzle Assembly */}
            <g className="nozzle-carriage">
              {/* Carriage block */}
              <rect x="175" y="28" width="50" height="24" rx="4" fill="var(--bg3)" stroke="var(--border)" strokeWidth="1.5" />
              {/* Fan/Cooler detail */}
              <rect x="185" y="34" width="12" height="12" rx="2" fill="#0b0f1e" />
              <circle cx="191" cy="40" r="3" fill="var(--teal)" opacity="0.8" />
              {/* Nozzle tip */}
              <path d="M 200 52 L 195 64 L 205 64 Z" fill="var(--text3)" />
              {/* Glowing laser/filament line printing the text */}
              <line x1="200" y1="64" x2="200" y2="100" stroke="var(--teal)" strokeWidth="2" strokeDasharray="3 3" opacity="0.8" />
              {/* Filament spool/tube entering carriage */}
              <path d="M 200 5 C 190 -5, 175 10, 200 28" fill="none" stroke="var(--pink)" strokeWidth="2.5" />
            </g>
          </svg>

          {/* Heading */}
          <h1
            style={{
              fontFamily: 'var(--font-orbitron), Noto Sans Hebrew, sans-serif',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '12px',
            }}
          >
            אופס! הדף לא נמצא
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--text2)',
              lineHeight: '1.8',
              maxWidth: '450px',
              margin: '0 auto 32px',
            }}
          >
            נראה שהגעת לכתובת שאינה קיימת או שהיא הועברה למיקום אחר. 
            אל דאגה, תוכל לחזור בקלות לדף הבית או ליצור איתנו קשר.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="btn-hero" style={{ padding: '12px 28px', fontSize: '14px' }}>
              חזרה לדף הבית
            </Link>
            <a href="/#contact" className="btn-ghost" style={{ padding: '12px 28px', fontSize: '14px' }}>
              צור קשר
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
