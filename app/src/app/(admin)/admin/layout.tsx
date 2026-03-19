import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const initials = session.user?.name?.charAt(0)?.toUpperCase() ?? 'A';
  const name = session.user?.name ?? 'Admin';
  const role = (session.user as { role?: string })?.role ?? 'ADMIN';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 60 }}>
      <AdminSidebar initials={initials} name={name} role={role} />

      {/* Main content */}
      <div className="admin-content">
        {children}
      </div>

      {/* Top nav bar */}
      <nav className="nav" style={{ zIndex: 600 }}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-play">PLAY</span><span className="nav-logo-3d">3D</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/" className="nl" style={{ fontSize: 13 }}>← אתר ראשי</Link>
          <ThemeToggle />
          {/* AdminSidebar renders burger here via portal-like approach — handled in component */}
        </div>
      </nav>
    </div>
  );
}
