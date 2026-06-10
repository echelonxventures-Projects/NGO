'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission, ManagedUser, RoleInfo } from '@/lib/admin-api';

interface CreateForm {
  email: string;
  name: string;
  password: string;
  roleKeys: string[];
}

const EMPTY_CREATE: CreateForm = { email: '', name: '', password: '', roleKeys: [] };

export default function UsersPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'user:write');

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState<CreateForm | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.listUsers(), adminApi.listRoles()])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleCreateRole(key: string) {
    if (!creating) return;
    const has = creating.roleKeys.includes(key);
    setCreating({
      ...creating,
      roleKeys: has ? creating.roleKeys.filter((k) => k !== key) : [...creating.roleKeys, key],
    });
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!creating) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.createUser({
        email: creating.email,
        name: creating.name || undefined,
        password: creating.password,
        roleKeys: creating.roleKeys,
      });
      setCreating(null);
      setNotice('User created.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRoles(u: ManagedUser, key: string) {
    setBusy(true);
    setError(null);
    const next = u.roles.includes(key) ? u.roles.filter((k) => k !== key) : [...u.roles, key];
    try {
      await adminApi.updateUser(u.id, { roleKeys: next });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u: ManagedUser) {
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateUser(u.id, { status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(u: ManagedUser) {
    const pw = window.prompt(`New password for ${u.email} (min 8 chars):`);
    if (!pw) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.resetUserPassword(u.id, pw);
      setNotice(`Password reset for ${u.email}.`);
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
        <h1>Users &amp; roles</h1>
        {canWrite && (
          <button className="btn btn-primary btn-sm" onClick={() => setCreating({ ...EMPTY_CREATE })}>
            + New user
          </button>
        )}
      </div>
      <p>Manage who can access this tenant and what they can do. Roles bundle permissions.</p>
      {error && <div className="notice err">{error}</div>}
      {notice && <div className="notice ok">{notice}</div>}

      {creating && (
        <form onSubmit={submitCreate} className="card admin-form" style={{ maxWidth: 560 }}>
          <h3>New user</h3>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={creating.email}
              onChange={(e) => setCreating({ ...creating, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Name</label>
            <input value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Temporary password (min 8 chars)</label>
            <input
              type="text"
              value={creating.password}
              onChange={(e) => setCreating({ ...creating, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label>Roles</label>
            <div className="role-checks">
              {roles.map((r) => (
                <label key={r.key} className="role-check">
                  <input
                    type="checkbox"
                    checked={creating.roleKeys.includes(r.key)}
                    onChange={() => toggleCreateRole(r.key)}
                  />{' '}
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create user'}
            </button>
            <button type="button" className="btn-sm" onClick={() => setCreating(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th>Roles</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? '—'}</td>
                <td>
                  <span className={`status status-${u.status.toLowerCase()}`}>{u.status}</span>
                </td>
                <td>
                  {canWrite ? (
                    <div className="role-checks">
                      {roles.map((r) => (
                        <label key={r.key} className="role-check">
                          <input
                            type="checkbox"
                            checked={u.roles.includes(r.key)}
                            onChange={() => changeRoles(u, r.key)}
                            disabled={busy}
                          />{' '}
                          {r.key}
                        </label>
                      ))}
                    </div>
                  ) : (
                    u.roles.join(', ') || '—'
                  )}
                </td>
                {canWrite && (
                  <td className="row-actions">
                    <button className="btn-sm" onClick={() => toggleStatus(u)} disabled={busy}>
                      {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn-sm" onClick={() => resetPassword(u)} disabled={busy}>
                      Reset password
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
