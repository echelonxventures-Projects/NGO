'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, Donation, Subscription, hasPermission } from '@/lib/admin-api';

/** Amounts are stored in integer minor units (e.g. paise/cents); show 2dp major units. */
function money(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function fmtDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : '—';
}

export default function DonationsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'donation:write');

  const [donations, setDonations] = useState<Donation[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.listDonations(), adminApi.listSubscriptions()])
      .then(([d, s]) => {
        setDonations(d);
        setSubs(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: 'pause' | 'resume' | 'cancel', id: string) {
    setBusy(true);
    setError(null);
    try {
      if (action === 'pause') await adminApi.pauseSubscription(id);
      else if (action === 'resume') await adminApi.resumeSubscription(id);
      else await adminApi.cancelSubscription(id);
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
      <h1>Donations</h1>
      {error && <div className="notice err">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <h3>Recurring subscriptions</h3>
          {subs.length === 0 ? (
            <p>No recurring subscriptions.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Interval</th>
                  <th>Status</th>
                  <th>Next charge</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>{s.donorEmail ?? '—'}</td>
                    <td>{money(s.amount, s.currency)}</td>
                    <td>{s.interval}</td>
                    <td>
                      <span className={`status status-${s.status.toLowerCase()}`}>{s.status}</span>
                    </td>
                    <td>{fmtDate(s.nextChargeAt)}</td>
                    <td className="row-actions">
                      {canWrite && s.status !== 'CANCELLED' && (
                        <>
                          {s.status === 'ACTIVE' ? (
                            <button className="btn-sm" onClick={() => act('pause', s.id)} disabled={busy}>
                              Pause
                            </button>
                          ) : (
                            <button className="btn-sm" onClick={() => act('resume', s.id)} disabled={busy}>
                              Resume
                            </button>
                          )}
                          <button className="btn-sm" onClick={() => act('cancel', s.id)} disabled={busy}>
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: 32 }}>One-time &amp; cycle donations</h3>
          {donations.length === 0 ? (
            <p>No donations yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>{fmtDate(d.createdAt)}</td>
                    <td>{d.donorEmail ?? d.donorName ?? '—'}</td>
                    <td>{money(d.amount, d.currency)}</td>
                    <td>
                      <span className={`status status-${d.status.toLowerCase()}`}>{d.status}</span>
                    </td>
                    <td>{d.receiptNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
