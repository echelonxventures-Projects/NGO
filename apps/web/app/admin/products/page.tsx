'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission, Product } from '@/lib/admin-api';

interface Form {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  price: string;
  stock: string;
  category: string;
}

const EMPTY: Form = { id: '', slug: '', title: '', type: 'PHYSICAL', status: 'ACTIVE', price: '0', stock: '', category: '' };

export default function ProductsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'product:write');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listProducts().then(setProducts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(p: Product) {
    setEditing({
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      status: p.status,
      price: String(p.price / 100),
      stock: p.stock == null ? '' : String(p.stock),
      category: p.category ?? '',
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      title: editing.title,
      type: editing.type,
      status: editing.status,
      price: Math.round(parseFloat(editing.price || '0') * 100),
      category: editing.category || undefined,
    };
    if (editing.type === 'PHYSICAL' && editing.stock !== '') body.stock = parseInt(editing.stock, 10);
    try {
      if (editing.id) await adminApi.updateProduct(editing.id, body);
      else await adminApi.createProduct({ ...body, slug: editing.slug });
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteProduct(p.id);
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
        <h1>Products</h1>
        {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY })}>+ New product</button>}
      </div>
      {error && <div className="notice err">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card admin-form" style={{ maxWidth: 560 }}>
          <h3>{editing.id ? 'Edit product' : 'New product'}</h3>
          <div className="field">
            <label>Title</label>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
          </div>
          {!editing.id && (
            <div className="field">
              <label>Slug</label>
              <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="eco-tote" required />
            </div>
          )}
          <div className="color-row">
            <div className="field">
              <label>Type</label>
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option value="PHYSICAL">Physical</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div className="color-row">
            <div className="field">
              <label>Price (major units)</label>
              <input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} required />
            </div>
            {editing.type === 'PHYSICAL' && (
              <div className="field">
                <label>Stock (blank = untracked)</label>
                <input type="number" min="0" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>Category</label>
              <input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Type</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.type}</td>
                <td>{p.currency} {(p.price / 100).toFixed(2)}</td>
                <td>{p.stock == null ? '∞' : p.stock}</td>
                <td><span className={`status status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                <td className="row-actions">
                  {canWrite && <button className="btn-sm" onClick={() => startEdit(p)} disabled={busy}>Edit</button>}
                  {canWrite && <button className="btn-sm" onClick={() => remove(p)} disabled={busy}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
