import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

// Tenant-branded PWA manifest (no hardcoded org details). Served at /manifest.webmanifest.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await api.getBranding().catch(() => null);
  const name = b?.tenant.name ?? 'DXP Platform';
  const primary = b?.branding.primaryColor ?? '#1b5e20';
  return {
    name,
    short_name: b?.branding.shortName ?? name,
    description: b?.branding.tagline ?? 'Digital Experience Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: primary,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
