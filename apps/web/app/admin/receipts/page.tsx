'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, Receipt } from '@/lib/admin-api';

function money(amount?: number, currency?: string) {
  if (amount == null || !currency) return '—';
  return `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listReceipts()
      .then(setReceipts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div>
      <h1>Receipts</h1>
      <p>Issued donation receipts (contain donor PII — access is permission-controlled).</p>
      {error && <div className="notice err">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : receipts.length === 0 ? (
        <p>No receipts issued yet. Receipts are generated automatically when a donation succeeds.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Donor</th>
              <th>Amount</th>
              <th>Issued</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td>{r.donorName ?? r.donorEmail ?? '—'}</td>
                <td>{money(r.amount, r.currency)}</td>
                <td>{r.issuedAt ? new Date(r.issuedAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
