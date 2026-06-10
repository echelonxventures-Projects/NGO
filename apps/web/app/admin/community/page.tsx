'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, CommunityPost } from '@/lib/admin-api';

export default function CommunityAdminPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listPosts().then(setPosts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!user) return null;
  return (
    <div>
      <h1>Community moderation</h1>
      <p>Pin important posts or remove content that violates guidelines.</p>
      {error && <div className="notice err">{error}</div>}
      {loading ? <p>Loading…</p> : posts.length === 0 ? <p>No posts yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Author</th><th>Comments</th><th>Pinned</th><th></th></tr></thead>
          <tbody>{posts.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.authorName ?? '—'}</td>
              <td>{p._count?.comments ?? 0}</td>
              <td>{p.pinned ? '★' : ''}</td>
              <td className="row-actions">
                <button className="btn-sm" onClick={() => act(() => adminApi.pinPost(p.id, !p.pinned))} disabled={busy}>{p.pinned ? 'Unpin' : 'Pin'}</button>
                <button className="btn-sm" onClick={() => { if (window.confirm('Delete post?')) act(() => adminApi.deletePost(p.id)); }} disabled={busy}>Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
