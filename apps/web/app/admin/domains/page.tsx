'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, Domain, DnsRecord } from '@/lib/admin-api';

export default function DomainsPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hostname, setHostname] = useState('');
  const [dns, setDns] = useState<DnsRecord | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listDomains()
      .then(setDomains)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDns(null);
    try {
      const res = await adminApi.addDomain(hostname.trim());
      setDns(res.dnsRecord);
      setHostname('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<unknown>) {
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
      <h1>Custom domains</h1>
      <p>Map your own domains to this tenant. Add a domain, publish the DNS TXT record, then verify.</p>
      {error && <div className="notice err">{error}</div>}

      <form onSubmit={add} className="card admin-form" style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Add a domain</label>
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="ngo.example.org"
            required
          />
        </div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add domain'}
        </button>
        {dns && (
          <div className="notice ok" style={{ marginTop: 12 }}>
            Publish this DNS record, then click Verify:
            <pre className="dns-record">
              {dns.type}  {dns.name}  {dns.value}
            </pre>
          </div>
        )}
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : domains.length === 0 ? (
        <p>No domains yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Status</th>
              <th>Primary</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.id}>
                <td>{d.hostname}</td>
                <td>
                  <span className={`status status-${d.status.toLowerCase()}`}>{d.status}</span>
                </td>
                <td>{d.isPrimary ? '★' : ''}</td>
                <td className="row-actions">
                  {d.status !== 'VERIFIED' && d.status !== 'ACTIVE' && (
                    <button
                      className="btn-sm"
                      onClick={() => run(() => adminApi.verifyDomain(d.id))}
                      disabled={busy}
                    >
                      Verify
                    </button>
                  )}
                  {!d.isPrimary && (
                    <button
                      className="btn-sm"
                      onClick={() => run(() => adminApi.setPrimaryDomain(d.id))}
                      disabled={busy}
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    className="btn-sm"
                    onClick={() => run(() => adminApi.removeDomain(d.id))}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
