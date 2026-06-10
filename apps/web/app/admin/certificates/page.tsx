'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, CertificateTemplate } from '@/lib/admin-api';

interface Form {
  id: string;
  type: string;
  name: string;
  template: string;
}

const EMPTY: Form = { id: '', type: 'tax80g', name: '', template: '' };

export default function CertificatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listCertificateTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id) {
        await adminApi.updateCertificateTemplate(editing.id, {
          name: editing.name,
          template: editing.template,
        });
      } else {
        await adminApi.createCertificateTemplate({
          type: editing.type,
          name: editing.name,
          template: editing.template,
        });
      }
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function ensure80G() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.ensureDefault80G();
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
        <h1>Certificate templates</h1>
        <div className="row-actions">
          <button className="btn-sm" onClick={ensure80G} disabled={busy}>
            Ensure default 80G
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>
            + New template
          </button>
        </div>
      </div>
      <p>HTML templates with {'{{placeholders}}'} used to render certificates (e.g. 80G, course, volunteer).</p>
      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form">
          <h3>{editing.id ? 'Edit template' : 'New template'}</h3>
          {!editing.id && (
            <div className="field">
              <label>Type</label>
              <input
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                placeholder="tax80g, course, volunteer…"
                required
              />
            </div>
          )}
          <div className="field">
            <label>Name</label>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Template (HTML with {'{{placeholders}}'})</label>
            <textarea
              rows={12}
              value={editing.template}
              onChange={(e) => setEditing({ ...editing, template: e.target.value })}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
              required
            />
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
      ) : templates.length === 0 ? (
        <p>No templates yet. Use “Ensure default 80G” to create the built-in 80G certificate.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="badge">{t.type}</span>
                </td>
                <td>{t.name}</td>
                <td className="row-actions">
                  <button
                    className="btn-sm"
                    onClick={() => setEditing({ id: t.id, type: t.type, name: t.name, template: t.template })}
                    disabled={busy}
                  >
                    Edit
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
