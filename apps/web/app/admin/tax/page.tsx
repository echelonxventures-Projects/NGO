'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, TaxRule } from '@/lib/admin-api';

interface Form {
  id: string;
  name: string;
  country: string;
  region: string;
  category: string;
  ratePct: string;
  priority: string;
  active: boolean;
}

const EMPTY: Form = {
  id: '',
  name: '',
  country: '',
  region: '',
  category: '',
  ratePct: '0',
  priority: '0',
  active: true,
};

export default function TaxPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listTaxRules()
      .then(setRules)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(r: TaxRule) {
    setEditing({
      id: r.id,
      name: r.name,
      country: r.country,
      region: r.region ?? '',
      category: r.category ?? '',
      ratePct: String(r.ratePct),
      priority: String(r.priority ?? 0),
      active: r.active ?? true,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: editing.name,
      country: editing.country.toUpperCase(),
      ratePct: Number(editing.ratePct),
      priority: Number(editing.priority),
      active: editing.active,
    };
    if (editing.region) body.region = editing.region;
    if (editing.category) body.category = editing.category;
    try {
      if (editing.id) await adminApi.updateTaxRule(editing.id, body);
      else await adminApi.createTaxRule(body);
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteTaxRule(id);
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
      <div className="page-head">
        <h1>Tax rules</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          + New rule
        </button>
      </div>
      <p>Region-based tax rates applied to donations (highest priority match wins).</p>
      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form" style={{ maxWidth: 560 }}>
          <h3>{editing.id ? 'Edit rule' : 'New rule'}</h3>
          <div className="field">
            <label>Name</label>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
          </div>
          <div className="color-row">
            <div className="field">
              <label>Country (ISO alpha-2)</label>
              <input
                value={editing.country}
                onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                maxLength={2}
                placeholder="IN"
                required
              />
            </div>
            <div className="field">
              <label>Region (optional)</label>
              <input value={editing.region} onChange={(e) => setEditing({ ...editing, region: e.target.value })} />
            </div>
          </div>
          <div className="color-row">
            <div className="field">
              <label>Category (optional)</label>
              <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </div>
            <div className="field">
              <label>Rate %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editing.ratePct}
                onChange={(e) => setEditing({ ...editing, ratePct: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Priority</label>
              <input
                type="number"
                value={editing.priority}
                onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />{' '}
              Active
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-sm" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : rules.length === 0 ? (
        <p>No tax rules defined.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
              <th>Region</th>
              <th>Category</th>
              <th>Rate</th>
              <th>Priority</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.country}</td>
                <td>{r.region ?? '—'}</td>
                <td>{r.category ?? '—'}</td>
                <td>{r.ratePct}%</td>
                <td>{r.priority ?? 0}</td>
                <td>{r.active ? 'Yes' : 'No'}</td>
                <td className="row-actions">
                  <button className="btn-sm" onClick={() => startEdit(r)} disabled={busy}>
                    Edit
                  </button>
                  <button className="btn-sm" onClick={() => remove(r.id)} disabled={busy}>
                    Delete
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
