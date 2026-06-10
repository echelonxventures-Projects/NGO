'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission, MembershipPlan } from '@/lib/admin-api';

interface Form { id: string; slug: string; name: string; price: string; interval: string; benefits: string; }
const EMPTY: Form = { id: '', slug: '', name: '', price: '0', interval: 'MONTHLY', benefits: '' };

export default function MembershipPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'membership:write');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listPlansAdmin().then(setPlans).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setError(null);
    const benefits = editing.benefits.split('\n').map((b) => b.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      name: editing.name, price: Math.round(parseFloat(editing.price || '0') * 100), interval: editing.interval, benefits,
    };
    try {
      if (editing.id) await adminApi.updatePlan(editing.id, body);
      else await adminApi.createPlan({ ...body, slug: editing.slug });
      setEditing(null); load();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!user) return null;
  return (
    <div>
      <div className="page-head">
        <h1>Membership plans</h1>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ New plan</button>}
      </div>
      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form" style={{ maxWidth: 520 }}>
          <h3>{editing.id ? 'Edit plan' : 'New plan'}</h3>
          <div className="field"><label>Name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
          {!editing.id && <div className="field"><label>Slug</label><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} required /></div>}
          <div className="color-row">
            <div className="field"><label>Price (0 = free)</label><input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
            <div className="field"><label>Interval</label>
              <select value={editing.interval} onChange={(e) => setEditing({ ...editing, interval: e.target.value })}>
                <option>MONTHLY</option><option>YEARLY</option><option>LIFETIME</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Benefits (one per line)</label><textarea rows={4} value={editing.benefits} onChange={(e) => setEditing({ ...editing, benefits: e.target.value })} /></div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p>Loading…</p> : plans.length === 0 ? <p>No plans yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Price</th><th>Interval</th><th>Benefits</th><th>Active</th><th></th></tr></thead>
          <tbody>{plans.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td><td>{p.price === 0 ? 'Free' : `${p.currency} ${(p.price / 100).toFixed(2)}`}</td><td>{p.interval}</td>
              <td>{(p.benefits ?? []).join(', ')}</td><td>{p.active ? 'Yes' : 'No'}</td>
              <td className="row-actions">
                {canWrite && <button className="btn-sm" onClick={() => setEditing({ id: p.id, slug: p.slug, name: p.name, price: String(p.price / 100), interval: p.interval, benefits: (p.benefits ?? []).join('\n') })} disabled={busy}>Edit</button>}
                {canWrite && <button className="btn-sm" onClick={() => { if (window.confirm('Delete plan?')) adminApi.deletePlan(p.id).then(load); }} disabled={busy}>Delete</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
