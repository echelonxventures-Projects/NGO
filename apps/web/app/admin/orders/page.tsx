'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission, Order } from '@/lib/admin-api';

function money(v: number, c: string) {
  return `${c} ${(v / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'order:write');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listOrders().then(setOrders).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <h1>Orders</h1>
      {error && <div className="notice err">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <Fragment key={o.id}>
                <tr>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                  <td>{o.customerName ?? o.customerEmail}</td>
                  <td>
                    <button className="btn-sm" onClick={() => setOpen(open === o.id ? null : o.id)}>
                      {o.items.length} item(s) {open === o.id ? '▲' : '▼'}
                    </button>
                  </td>
                  <td>{money(o.total, o.currency)}</td>
                  <td><span className={`status status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                  <td className="row-actions">
                    {canWrite && o.status === 'PAID' && (
                      <button className="btn-sm" onClick={() => act(() => adminApi.fulfillOrder(o.id))} disabled={busy}>Fulfill</button>
                    )}
                    {canWrite && ['PAID', 'FULFILLED'].includes(o.status) && (
                      <button className="btn-sm" onClick={() => act(() => adminApi.refundOrder(o.id))} disabled={busy}>Refund</button>
                    )}
                    {canWrite && o.status === 'PENDING' && (
                      <button className="btn-sm" onClick={() => act(() => adminApi.cancelOrder(o.id))} disabled={busy}>Cancel</button>
                    )}
                  </td>
                </tr>
                {open === o.id && (
                  <tr key={`${o.id}-items`}>
                    <td colSpan={6}>
                      <ul style={{ margin: '4px 0' }}>
                        {o.items.map((it) => (
                          <li key={it.id}>
                            {it.titleSnapshot} × {it.quantity} — {money(it.lineTotal, o.currency)}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
