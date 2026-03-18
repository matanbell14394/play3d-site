import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { label: 'ראשי', items: [
    { href: '/admin/dashboard', icon: '◈', label: 'לוח בקרה' },
  ]},
  { label: 'ניהול', items: [
    { href: '/admin/orders', icon: '◎', label: 'הזמנות' },
    { href: '/admin/products', icon: '⬡', label: 'מוצרים' },
    { href: '/admin/inventory', icon: '⊞', label: 'מלאי' },
    { href: '/admin/users', icon: '👥', label: 'משתמשים' },
  ]},
  { label: 'תוכן', items: [
    { href: '/admin/gallery', icon: '▦', label: 'גלריה' },
    { href: '/admin/contacts', icon: '✉', label: 'פניות' },
    { href: '/admin/settings', icon: '⚙', label: 'הגדרות' },
  ]},
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const initials = session.user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const role = (session.user as { role?: string })?.role ?? 'ADMIN';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 60 }}>
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sb-logo">
          <div className="logo"><span className="nav-logo-play">PLAY</span><span className="nav-logo-3d">3D</span></div>
          <div className="sub">ADMIN</div>
        </div>
        <div className="nav-sec">
          {NAV_ITEMS.map((group) => (
            <div key={group.label}>
              <div className="nav-lbl">{group.label}</div>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="nav-item">
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
            <div className="s-name">{session.user?.name ?? 'Admin'}</div>
            <div className="s-role">{role}</div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="logout-btn">יציאה</button>
          </form>
        </div>
      </nav>

      {/* Main content */}
      <div className="admin-content">
        {children}
      </div>

      {/* Top nav bar overlay */}
      <nav className="nav" style={{ zIndex: 600 }}>
        <Link href="/" className="nav-logo"><span className="nav-logo-play">PLAY</span><span className="nav-logo-3d">3D</span></Link>
        <div className="nav-links">
          <Link href="/" className="nl">← אתר ראשי</Link>
          <ThemeToggle />
        </div>
      </nav>
    </div>
  );
}
