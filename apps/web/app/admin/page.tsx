'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './auth-context';
import { adminApi, hasPermission } from '@/lib/admin-api';

interface Stats {
  content?: number;
  published?: number;
  donations?: number;
  subscriptions?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    if (!user) return;
    const tasks: Promise<void>[] = [];
    if (hasPermission(user, 'content:read')) {
      tasks.push(
        adminApi
          .listContent()
          .then((c) =>
            setStats((s) => ({
              ...s,
              content: c.length,
              published: c.filter((x) => x.status === 'PUBLISHED').length,
            })),
          )
          .catch(() => undefined),
      );
    }
    if (hasPermission(user, 'donation:read')) {
      tasks.push(
        adminApi
          .listDonations()
          .then((d) => setStats((s) => ({ ...s, donations: d.length })))
          .catch(() => undefined),
      );
      tasks.push(
        adminApi
          .listSubscriptions()
          .then((subs) => setStats((s) => ({ ...s, subscriptions: subs.length })))
          .catch(() => undefined),
      );
    }
    void Promise.all(tasks);
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome back, {user.email}.</p>

      <div className="stat-grid">
        {hasPermission(user, 'content:read') && (
          <Link href="/admin/content" className="stat-card">
            <span className="stat-value">{stats.content ?? '—'}</span>
            <span className="stat-label">Content items</span>
            <span className="stat-sub">{stats.published ?? 0} published</span>
          </Link>
        )}
        {hasPermission(user, 'donation:read') && (
          <Link href="/admin/donations" className="stat-card">
            <span className="stat-value">{stats.donations ?? '—'}</span>
            <span className="stat-label">Donations</span>
          </Link>
        )}
        {hasPermission(user, 'donation:read') && (
          <Link href="/admin/donations" className="stat-card">
            <span className="stat-value">{stats.subscriptions ?? '—'}</span>
            <span className="stat-label">Recurring subscriptions</span>
          </Link>
        )}
        {hasPermission(user, 'branding:read') && (
          <Link href="/admin/branding" className="stat-card">
            <span className="stat-value">⚙</span>
            <span className="stat-label">Branding &amp; theme</span>
          </Link>
        )}
      </div>
    </div>
  );
}
