'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth-context';
import { adminApi, Course, hasPermission } from '@/lib/admin-api';

interface Form {
  slug: string;
  title: string;
  summary: string;
  price: string;
}

const EMPTY: Form = { slug: '', title: '', summary: '', price: '0' };

export default function CoursesPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'course:write');
  const canPublish = hasPermission(user, 'course:publish');

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listCourses()
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!creating) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.createCourse({
        slug: creating.slug,
        title: creating.title,
        summary: creating.summary || undefined,
        price: Math.round(parseFloat(creating.price || '0') * 100),
      });
      setCreating(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(c: Course) {
    setBusy(true);
    setError(null);
    try {
      if (c.status === 'PUBLISHED') await adminApi.unpublishCourse(c.id);
      else await adminApi.publishCourse(c.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Course) {
    if (!window.confirm(`Delete course “${c.title}” and all its content?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteCourse(c.id);
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
        <h1>Courses</h1>
        {canWrite && (
          <button className="btn btn-primary btn-sm" onClick={() => setCreating({ ...EMPTY })}>
            + New course
          </button>
        )}
      </div>
      {error && <div className="notice err">{error}</div>}

      {creating && (
        <form onSubmit={create} className="card admin-form" style={{ maxWidth: 560 }}>
          <h3>New course</h3>
          <div className="field">
            <label>Title</label>
            <input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} required />
          </div>
          <div className="field">
            <label>Slug</label>
            <input value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: e.target.value })} placeholder="intro-to-ngo" required />
          </div>
          <div className="field">
            <label>Summary</label>
            <input value={creating.summary} onChange={(e) => setCreating({ ...creating, summary: e.target.value })} />
          </div>
          <div className="field">
            <label>Price (0 = free)</label>
            <input type="number" min="0" step="0.01" value={creating.price} onChange={(e) => setCreating({ ...creating, price: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
            <button type="button" className="btn-sm" onClick={() => setCreating(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : courses.length === 0 ? (
        <p>No courses yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Modules</th>
              <th>Enrolled</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/courses/${c.id}`}>{c.title}</Link>
                </td>
                <td>{c._count?.modules ?? 0}</td>
                <td>{c._count?.enrollments ?? 0}</td>
                <td>{c.price === 0 ? 'Free' : `${c.currency} ${(c.price / 100).toFixed(2)}`}</td>
                <td>
                  <span className={`status status-${c.status.toLowerCase()}`}>{c.status}</span>
                </td>
                <td className="row-actions">
                  <Link className="btn-sm" href={`/admin/courses/${c.id}`}>Build</Link>
                  {canPublish && (
                    <button className="btn-sm" onClick={() => togglePublish(c)} disabled={busy}>
                      {c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                  {canWrite && (
                    <button className="btn-sm" onClick={() => remove(c)} disabled={busy}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
