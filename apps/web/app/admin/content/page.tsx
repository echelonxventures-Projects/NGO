'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, ContentItem, hasPermission } from '@/lib/admin-api';

const EMPTY = { id: '', type: 'program', slug: '', title: '', excerpt: '', bodyText: '' };

export default function ContentPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'content:write');
  const canPublish = hasPermission(user, 'content:publish');

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listContent()
      .then((c) => setItems(c))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditing({ ...EMPTY });
  }

  function startEdit(item: ContentItem) {
    // Represent the body as a single text block for simple editing.
    const blocks = (item.body as { blocks?: { text?: string }[] })?.blocks;
    const bodyText = blocks?.map((b) => b.text).filter(Boolean).join('\n\n') ?? '';
    setEditing({
      id: item.id,
      type: item.type,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt ?? '',
      bodyText,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    const body = editing.bodyText
      ? { blocks: editing.bodyText.split(/\n{2,}/).map((t) => ({ type: 'text', text: t.trim() })) }
      : {};
    try {
      if (editing.id) {
        await adminApi.updateContent(editing.id, {
          title: editing.title,
          excerpt: editing.excerpt,
          body,
        });
      } else {
        await adminApi.createContent({
          type: editing.type,
          slug: editing.slug,
          title: editing.title,
          excerpt: editing.excerpt,
          body,
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

  async function togglePublish(item: ContentItem) {
    setBusy(true);
    setError(null);
    try {
      if (item.status === 'PUBLISHED') await adminApi.unpublishContent(item.id);
      else await adminApi.publishContent(item.id);
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
        <h1>Content</h1>
        {canWrite && (
          <button className="btn btn-primary btn-sm" onClick={startCreate}>
            + New content
          </button>
        )}
      </div>

      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form">
          <h3>{editing.id ? 'Edit content' : 'New content'}</h3>
          {!editing.id && (
            <>
              <div className="field">
                <label>Type</label>
                <input
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  placeholder="program, page, post…"
                  required
                />
              </div>
              <div className="field">
                <label>Slug</label>
                <input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="clean-water-initiative"
                  required
                />
              </div>
            </>
          )}
          <div className="field">
            <label>Title</label>
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Excerpt</label>
            <input
              value={editing.excerpt}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Body (paragraphs separated by a blank line)</label>
            <textarea
              rows={6}
              value={editing.bodyText}
              onChange={(e) => setEditing({ ...editing, bodyText: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-sm"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No content yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Slug</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.type}</td>
                <td>{item.slug}</td>
                <td>
                  <span className={`status status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td className="row-actions">
                  {canWrite && (
                    <button className="btn-sm" onClick={() => startEdit(item)} disabled={busy}>
                      Edit
                    </button>
                  )}
                  {canPublish && (
                    <button className="btn-sm" onClick={() => togglePublish(item)} disabled={busy}>
                      {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>
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
