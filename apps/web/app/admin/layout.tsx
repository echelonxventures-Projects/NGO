'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './auth-context';
import { hasPermission } from '@/lib/admin-api';

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/content', label: 'Content', permission: 'content:read' },
  { href: '/admin/courses', label: 'Courses', permission: 'course:read' },
  { href: '/admin/products', label: 'Products', permission: 'product:read' },
  { href: '/admin/orders', label: 'Orders', permission: 'order:read' },
  { href: '/admin/events', label: 'Events', permission: 'event:read' },
  { href: '/admin/volunteers', label: 'Volunteers', permission: 'volunteer:read' },
  { href: '/admin/membership', label: 'Membership', permission: 'membership:read' },
  { href: '/admin/community', label: 'Community', permission: 'community:moderate' },
  { href: '/admin/donations', label: 'Donations', permission: 'donation:read' },
  { href: '/admin/receipts', label: 'Receipts', permission: 'donation:read' },
  { href: '/admin/certificates', label: 'Certificates', permission: 'tenant:admin' },
  { href: '/admin/tax', label: 'Tax rules', permission: 'tenant:admin' },
  { href: '/admin/currencies', label: 'Currencies', permission: 'tenant:admin' },
  { href: '/admin/domains', label: 'Domains', permission: 'tenant:admin' },
  { href: '/admin/users', label: 'Users & roles', permission: 'user:read' },
  { href: '/admin/branding', label: 'Branding', permission: 'branding:read' },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Redirect unauthenticated users to login (once auth state has resolved).
  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login');
  }, [loading, user, router]);

  if (loading) {
    return <div className="admin-loading">Loading…</div>;
  }
  if (!user) {
    // Redirect effect is in flight; render nothing to avoid a flash of protected content.
    return null;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo">Admin</div>
        <nav>
          {NAV.filter((n) => !n.permission || hasPermission(user, n.permission)).map((n) => {
            const active = n.href === '/admin' ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`admin-nav-link${active ? ' active' : ''}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <a href="/" className="admin-topbar-link">← View site</a>
          <div className="admin-user">
            <span className="admin-user-email">{user.email}</span>
            <span className="badge">{user.roles.join(', ') || 'no role'}</span>
            <button className="btn-sm" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthProvider>
      {pathname === '/admin/login' ? (
        // The login page renders standalone (no shell/guard).
        children
      ) : (
        <Shell>{children}</Shell>
      )}
    </AuthProvider>
  );
}
