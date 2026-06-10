import type { Metadata } from 'next';
import './globals.css';
import { api } from '@/lib/api';

// SSR metadata derived from tenant branding — satisfies the SEO requirement (per-tenant
// title/description, OpenGraph) with no hardcoded org details.
export async function generateMetadata(): Promise<Metadata> {
  const b = await api.getBranding();
  const name = b?.tenant.name ?? 'DXP Platform';
  const tagline = b?.branding.tagline ?? 'Digital Experience Platform';
  return {
    title: { default: name, template: `%s · ${name}` },
    description: tagline,
    openGraph: { title: name, description: tagline, type: 'website' },
    icons: b?.branding.logoUrl ? [{ url: b.branding.logoUrl }] : undefined,
  };
}

// Root layout: owns <html>/<body> and injects the branding-driven theme (CSS variables)
// for every section (public site + admin portal). Section-specific chrome (public header/
// footer vs. admin shell) lives in the respective route-group layouts.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const b = await api.getBranding();
  const primary = b?.branding.primaryColor ?? '#1b5e20';
  const accent = b?.branding.accentColor ?? primary;
  const font = b?.branding.fontFamily;

  // Branding-driven theme: inject CSS variables from tenant data (no hardcoded theme).
  const themeVars = `:root{--brand-primary:${primary};--brand-accent:${accent};${
    font ? `--brand-font:${font};` : ''
  }}`;

  return (
    <html lang={b?.config.defaultLocale ?? 'en'}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
