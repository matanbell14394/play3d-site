'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { label: 'ראשי', items: [
    { href: '/admin/dashboard', icon: '◈', label: 'לוח בקרה' },
  ]},
  { label: 'ניהול', items: [
    { href: '/admin/orders', icon: '◎', label: 'הזמנות' },
    { href: '/admin/products', icon: '⬡', label: 'מוצרים' },
    { href: '/admin/sales', icon: '💰', label: 'מכירות' },
    { href: '/admin/inventory', icon: '⊞', label: 'מלאי' },
    { href: '/admin/users', icon: '👥', label: 'משתמשים' },
  ]},
  { label: 'תוכן', items: [
    { href: '/admin/gallery', icon: '▦', label: 'גלריה' },
    { href: '/admin/blog', icon: '✍', label: 'בלוג' },
    { href: '/admin/contacts', icon: '✉', label: 'פניות' },
    { href: '/admin/settings', icon: '⚙', label: 'הגדרות' },
  ]},
];

interface Props {
  initials: string;
  name: string;
  role: string;
}

export default function AdminSidebar({ initials, name, role }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile hamburger in top nav */}
      <button className="admin-burger" onClick={() => setOpen(o => !o)} aria-label="תפריט ניהול">
        <span className={open ? 'bline open' : 'bline'} />
        <span className={open ? 'bline open' : 'bline'} />
        <span className={open ? 'bline open' : 'bline'} />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="admin-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="nav-sec">
          {NAV_ITEMS.map((group) => (
            <div key={group.label}>
              <div className="nav-lbl">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${pathname === item.href ? ' active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="sb-footer">
          <div className="s-av">{initials}</div>
          <div>
            <div className="s-name">{name}</div>
            <div className="s-role">{role}</div>
          </div>
          <ThemeToggle />
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="logout-btn">יציאה</button>
          </form>
        </div>
      </nav>
    </>
  );
}
