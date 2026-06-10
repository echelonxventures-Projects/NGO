'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi, ApiError } from '@/lib/admin-api';

function RegisterForm() {
  const search = useSearchParams();
  const returnTo = search.get('returnTo') || '/courses';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.register(email, password, name || undefined);
      window.location.href = returnTo;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'An account with this email already exists.'
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1>Create account</h1>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>
      <div className="field">
        <label>Password (min 8 characters)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
      {error && <div className="notice err">{error}</div>}
      <p className="stat-sub" style={{ marginTop: 12 }}>
        Already have an account? <a href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</a>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <main className="section container">
      <Suspense fallback={<p>Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
