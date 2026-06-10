'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, CommunityPost, tokenStore } from '@/lib/admin-api';

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const loggedIn = typeof window !== 'undefined' && !!tokenStore.get();

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listPosts().then(setPosts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.createPost({ title, body });
      setTitle(''); setBody('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section container">
      <h1>Community</h1>
      {error && <div className="notice err">{error}</div>}

      {loggedIn ? (
        <form onSubmit={post} className="card" style={{ maxWidth: 640 }}>
          <div className="field"><label>Start a discussion</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required /></div>
          <div className="field"><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's on your mind?" required /></div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>
        </form>
      ) : (
        <p><a href="/login?returnTo=/community">Log in</a> to join the discussion.</p>
      )}

      {loading ? <p>Loading…</p> : posts.length === 0 ? <p>No posts yet. Be the first!</p> : (
        posts.map((p) => (
          <div className="card" key={p.id} style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>{p.pinned ? '📌 ' : ''}{p.title}</h3>
            <p className="stat-sub">{p.authorName ?? 'Anonymous'} · {p._count?.comments ?? 0} comments</p>
            <p>{p.body}</p>
          </div>
        ))
      )}
    </main>
  );
}
