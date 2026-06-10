'use client';

import { useState } from 'react';
import { adminApi, tokenStore } from '@/lib/admin-api';

export default function BuyBox({
  productId,
  title,
  outOfStock,
}: {
  productId: string;
  title: string;
  outOfStock: boolean;
}) {
  const loggedInUser = tokenStore.getUser();
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState(loggedInUser?.email ?? '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const order = await adminApi.checkout({
        customerEmail: email,
        customerName: name || undefined,
        items: [{ productId, quantity: qty }],
      });
      setResult({
        ok: true,
        msg: `Order confirmed! ${title} × ${qty}. Total ${order.currency} ${(order.total / 100).toFixed(2)} (${order.status}).`,
      });
    } catch (err) {
      setResult({ ok: false, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (outOfStock) return <div className="notice err">Out of stock.</div>;

  return (
    <form onSubmit={buy} className="card" style={{ maxWidth: 420 }}>
      <div className="field">
        <label>Quantity</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Processing…' : 'Buy now'}
      </button>
      {result && <div className={`notice ${result.ok ? 'ok' : 'err'}`}>{result.msg}</div>}
    </form>
  );
}
