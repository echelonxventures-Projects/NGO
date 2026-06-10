'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, hasPermission } from '@/lib/admin-api';

interface Form {
  shortName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
}

const BLANK: Form = {
  shortName: '',
  tagline: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#1b5e20',
  accentColor: '#2e7d32',
  fontFamily: '',
  facebook: '',
  twitter: '',
  instagram: '',
  linkedin: '',
};

const SOCIAL_KEYS = ['facebook', 'twitter', 'instagram', 'linkedin'] as const;

export default function BrandingPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'branding:write');

  const [form, setForm] = useState<Form>(BLANK);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    adminApi
      .getBranding()
      .then((b) => {
        const br = b.branding ?? {};
        const social = br.socialLinks ?? {};
        setTenantName(b.tenant?.name ?? '');
        setForm({
          shortName: br.shortName ?? '',
          tagline: br.tagline ?? '',
          logoUrl: br.logoUrl ?? '',
          faviconUrl: '',
          primaryColor: br.primaryColor ?? '#1b5e20',
          accentColor: br.accentColor ?? '#2e7d32',
          fontFamily: br.fontFamily ?? '',
          facebook: social.facebook ?? '',
          twitter: social.twitter ?? '',
          instagram: social.instagram ?? '',
          linkedin: social.linkedin ?? '',
        });
      })
      .catch((e) => setStatus({ ok: false, msg: e.message }))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    // Only send non-empty values: URL/hex fields are validated server-side and reject "".
    const body: Record<string, unknown> = {};
    if (form.shortName) body.shortName = form.shortName;
    if (form.tagline) body.tagline = form.tagline;
    if (form.logoUrl) body.logoUrl = form.logoUrl;
    if (form.faviconUrl) body.faviconUrl = form.faviconUrl;
    if (form.primaryColor) body.primaryColor = form.primaryColor;
    if (form.accentColor) body.accentColor = form.accentColor;
    if (form.fontFamily) body.fontFamily = form.fontFamily;

    const socialLinks: Record<string, string> = {};
    for (const k of SOCIAL_KEYS) if (form[k]) socialLinks[k] = form[k];
    if (Object.keys(socialLinks).length) body.socialLinks = socialLinks;

    try {
      await adminApi.updateBranding(body);
      setStatus({ ok: true, msg: 'Branding saved. Refresh the public site to see changes.' });
    } catch (err) {
      setStatus({ ok: false, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h1>Branding</h1>
      <p>Theme and identity for {tenantName || 'this tenant'}. Drives the public site with no code changes.</p>

      <form onSubmit={save} className="card admin-form" style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Short name</label>
          <input value={form.shortName} onChange={(e) => set('shortName', e.target.value)} disabled={!canWrite} />
        </div>
        <div className="field">
          <label>Tagline</label>
          <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} disabled={!canWrite} />
        </div>
        <div className="field">
          <label>Logo URL</label>
          <input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…" disabled={!canWrite} />
        </div>
        <div className="field">
          <label>Favicon URL</label>
          <input value={form.faviconUrl} onChange={(e) => set('faviconUrl', e.target.value)} placeholder="https://…" disabled={!canWrite} />
        </div>
        <div className="color-row">
          <div className="field">
            <label>Primary color</label>
            <input type="color" value={form.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} disabled={!canWrite} />
          </div>
          <div className="field">
            <label>Accent color</label>
            <input type="color" value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} disabled={!canWrite} />
          </div>
        </div>
        <div className="field">
          <label>Font family</label>
          <input value={form.fontFamily} onChange={(e) => set('fontFamily', e.target.value)} placeholder="Inter, system-ui, sans-serif" disabled={!canWrite} />
        </div>

        <h3>Social links</h3>
        {SOCIAL_KEYS.map((k) => (
          <div className="field" key={k}>
            <label style={{ textTransform: 'capitalize' }}>{k}</label>
            <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://…" disabled={!canWrite} />
          </div>
        ))}

        {canWrite && (
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save branding'}
          </button>
        )}
        {status && <div className={`notice ${status.ok ? 'ok' : 'err'}`}>{status.msg}</div>}
      </form>
    </div>
  );
}
