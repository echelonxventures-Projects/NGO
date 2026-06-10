'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission, Opportunity, VolunteerSignupRow } from '@/lib/admin-api';

export default function VolunteersPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'volunteer:write');
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [signups, setSignups] = useState<VolunteerSignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [slots, setSlots] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.listOpportunities(), adminApi.listSignups()])
      .then(([o, s]) => { setOpps(o); setSignups(s); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!user) return null;
  return (
    <div>
      <h1>Volunteers</h1>
      {error && <div className="notice err">{error}</div>}

      {canWrite && (
        <form className="card admin-form" style={{ maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); if (!title) return; act(() => adminApi.createOpportunity({ title, slots: slots ? parseInt(slots, 10) : undefined })).then(() => { setTitle(''); setSlots(''); }); }}>
          <div className="color-row">
            <div className="field" style={{ flex: 2 }}><label>New opportunity</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" /></div>
            <div className="field"><label>Slots</label><input type="number" min="0" value={slots} onChange={(e) => setSlots(e.target.value)} /></div>
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>Add opportunity</button>
        </form>
      )}

      <h3>Opportunities</h3>
      {loading ? <p>Loading…</p> : opps.length === 0 ? <p>None yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Slots</th><th>Signups</th><th>Active</th><th></th></tr></thead>
          <tbody>{opps.map((o) => (
            <tr key={o.id}>
              <td>{o.title}</td><td>{o.slots ?? '∞'}</td><td>{o._count?.signups ?? 0}</td><td>{o.active ? 'Yes' : 'No'}</td>
              <td className="row-actions">
                {canWrite && <button className="btn-sm" onClick={() => act(() => adminApi.updateOpportunity(o.id, { active: !o.active }))} disabled={busy}>{o.active ? 'Close' : 'Reopen'}</button>}
                {canWrite && <button className="btn-sm" onClick={() => act(() => adminApi.deleteOpportunity(o.id))} disabled={busy}>Delete</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <h3 style={{ marginTop: 24 }}>Signups</h3>
      {signups.length === 0 ? <p>No signups yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Hours</th><th></th></tr></thead>
          <tbody>{signups.map((s) => (
            <tr key={s.id}>
              <td>{s.email}</td><td>{s.name ?? '—'}</td>
              <td><span className={`status status-${s.status.toLowerCase()}`}>{s.status}</span></td>
              <td>{s.hours}</td>
              <td className="row-actions">
                {canWrite && s.status === 'APPLIED' && <button className="btn-sm" onClick={() => act(() => adminApi.updateSignup(s.id, { status: 'APPROVED' }))} disabled={busy}>Approve</button>}
                {canWrite && <button className="btn-sm" onClick={() => { const h = window.prompt('Hours:', String(s.hours)); if (h != null) act(() => adminApi.updateSignup(s.id, { hours: parseInt(h, 10) || 0, status: 'COMPLETED' })); }} disabled={busy}>Log hours</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
