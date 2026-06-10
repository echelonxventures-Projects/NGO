'use client';

import { useState } from 'react';
import { adminApi, tokenStore } from '@/lib/admin-api';

export default function EventRegister({ eventId }: { eventId: string }) {
  const u = tokenStore.getUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(u?.email ?? '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      // Public registration endpoint (no auth required).
      const res = await fetch(`${adminApi.apiBase}/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant': adminApi.tenant },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Registration failed');
      setResult({ ok: true, msg: `Registered! Your ticket: ${data.ticketCode}` });
    } catch (err) {
      setResult({ ok: false, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) return <div className="notice ok">{result.msg}</div>;

  if (!open) {
    return <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>Register</button>;
  }

  return (
    <form onSubmit={register} style={{ marginTop: 8 }}>
      <div className="lesson-add">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? '…' : 'Confirm'}</button>
      </div>
      {result && !result.ok && <div className="notice err">{result.msg}</div>}
    </form>
  );
}
