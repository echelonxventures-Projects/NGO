'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi, ApiError } from '@/lib/admin-api';

function LoginForm() {
  const search = useSearchParams();
  const returnTo = search.get('returnTo') || '/courses';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Invalid email or password.'
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1>Sign in</h1>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <div className="notice err">{error}</div>}
      <p className="stat-sub" style={{ marginTop: 12 }}>
        New here? <a href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Create an account</a>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="section container">
      <Suspense fallback={<p>Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
