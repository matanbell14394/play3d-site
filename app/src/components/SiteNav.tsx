'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

const LINKS = [
  { href: '/', label: 'בית', id: 'home' },
  { href: '/materials', label: 'חומרים', id: 'materials' },
  { href: '/gallery', label: 'גלריה', id: 'gallery' },
  { href: '/how-it-works', label: 'איך זה עובד', id: 'how-it-works' },
  { href: '/blog', label: 'בלוג', id: 'blog' },
  { href: '/#contact', label: 'צור קשר', id: 'contact' },
];

export default function SiteNav({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <span className="nav-logo-play">PLAY</span><span className="nav-logo-3d">3D</span>
        </Link>

        {/* Desktop */}
        <div className="nav-links">
          {LINKS.map(l => (
            <Link key={l.id} href={l.href} className={`nl${active === l.id ? ' active' : ''}`}>{l.label}</Link>
          ))}
          <Link href="/login" className="nl special">אזור לקוח</Link>
          <Link href="/admin/dashboard" className="nl cta">ניהול</Link>
          <ThemeToggle />
        </div>

        {/* Mobile */}
        <div className="nav-mobile-right">
          <ThemeToggle />
          <button className="burger" onClick={() => setOpen(o => !o)} aria-label="תפריט">
            <span className={open ? 'bline open' : 'bline'} />
            <span className={open ? 'bline open' : 'bline'} />
            <span className={open ? 'bline open' : 'bline'} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="mobile-drawer" onClick={() => setOpen(false)}>
          <div className="mobile-drawer-inner" onClick={e => e.stopPropagation()}>
            {LINKS.map(l => (
              <Link key={l.id} href={l.href} className={`mdl${active === l.id ? ' mdl-active' : ''}`} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="mdl-divider" />
            <Link href="/login" className="mdl mdl-special" onClick={() => setOpen(false)}>אזור לקוח</Link>
            <Link href="/admin/dashboard" className="mdl mdl-cta" onClick={() => setOpen(false)}>ניהול</Link>
          </div>
        </div>
      )}
    </>
  );
}
