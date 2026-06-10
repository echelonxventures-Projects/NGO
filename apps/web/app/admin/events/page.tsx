'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, EventRow, EventReg, hasPermission } from '@/lib/admin-api';

interface Form { id: string; slug: string; title: string; mode: string; location: string; startsAt: string; capacity: string; price: string; description: string; }
const EMPTY: Form = { id: '', slug: '', title: '', mode: 'PHYSICAL', location: '', startsAt: '', capacity: '', price: '0', description: '' };

export default function EventsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'event:write');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [regs, setRegs] = useState<{ id: string; list: EventReg[] } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listEventsAdmin().then(setEvents).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setError(null);
    const body: Record<string, unknown> = {
      title: editing.title, mode: editing.mode, location: editing.location || undefined,
      startsAt: new Date(editing.startsAt).toISOString(),
      capacity: editing.capacity ? parseInt(editing.capacity, 10) : undefined,
      price: Math.round(parseFloat(editing.price || '0') * 100), description: editing.description || undefined,
    };
    try {
      if (editing.id) await adminApi.updateEvent(editing.id, body);
      else await adminApi.createEvent({ ...body, slug: editing.slug });
      setEditing(null); load();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); load(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  if (!user) return null;
  return (
    <div>
      <div className="page-head">
        <h1>Events</h1>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ New event</button>}
      </div>
      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form" style={{ maxWidth: 560 }}>
          <h3>{editing.id ? 'Edit event' : 'New event'}</h3>
          <div className="field"><label>Title</label><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></div>
          {!editing.id && <div className="field"><label>Slug</label><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} required /></div>}
          <div className="color-row">
            <div className="field"><label>Mode</label>
              <select value={editing.mode} onChange={(e) => setEditing({ ...editing, mode: e.target.value })}>
                <option>PHYSICAL</option><option>ONLINE</option><option>HYBRID</option>
              </select>
            </div>
            <div className="field"><label>Starts at</label><input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} required /></div>
          </div>
          <div className="color-row">
            <div className="field"><label>Capacity (blank = unlimited)</label><input type="number" min="0" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} /></div>
            <div className="field"><label>Price</label><input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
          </div>
          <div className="field"><label>Location / stream URL</label><input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p>Loading…</p> : events.length === 0 ? <p>No events yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Title</th><th>When</th><th>Registered</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.title}</td>
                <td>{new Date(ev.startsAt).toLocaleString()}</td>
                <td>
                  <button className="btn-sm" onClick={() => adminApi.eventRegistrations(ev.id).then((l) => setRegs({ id: ev.id, list: l }))}>
                    {ev._count?.registrations ?? 0}{ev.capacity ? `/${ev.capacity}` : ''}
                  </button>
                </td>
                <td><span className={`status status-${ev.status.toLowerCase()}`}>{ev.status}</span></td>
                <td className="row-actions">
                  {canWrite && <button className="btn-sm" onClick={() => act(() => ev.status === 'PUBLISHED' ? adminApi.unpublishEvent(ev.id) : adminApi.publishEvent(ev.id))} disabled={busy}>{ev.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>}
                  {canWrite && <button className="btn-sm" onClick={() => act(() => adminApi.deleteEvent(ev.id))} disabled={busy}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {regs && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-head"><h3 style={{ margin: 0 }}>Registrations</h3><button className="btn-sm" onClick={() => setRegs(null)}>Close</button></div>
          {regs.list.length === 0 ? <p>No registrations.</p> : (
            <table className="admin-table">
              <thead><tr><th>Ticket</th><th>Email</th><th>Name</th><th>Status</th></tr></thead>
              <tbody>{regs.list.map((r) => (<tr key={r.id}><td>{r.ticketCode}</td><td>{r.email}</td><td>{r.name ?? '—'}</td><td>{r.status}</td></tr>))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
