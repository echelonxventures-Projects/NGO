import { api } from '@/lib/api';

// Public site chrome (header + footer). Lives in the (site) route group so it does NOT wrap
// the admin portal. Route groups don't affect URLs, so /, /programs, /donate are unchanged.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const b = await api.getBranding();
  const name = b?.tenant.name ?? 'DXP Platform';

  // Organization schema.org structured data for SEO.
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name,
    description: b?.branding.tagline,
    sameAs: Object.values(b?.branding.socialLinks ?? {}).filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <header className="site-header container">
        <a className="brand" href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          {b?.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.branding.logoUrl} alt={name} height={36} />
          ) : null}
          <span>{name}</span>
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/programs">Programs</a>
          <a href="/courses">Courses</a>
          <a href="/shop">Shop</a>
          <a href="/events">Events</a>
          <a href="/community">Community</a>
          <a href="/membership">Membership</a>
          <a href="/donate">Donate</a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container">
          © {new Date().getFullYear()} {name}. {b?.branding.tagline}
        </div>
      </footer>
    </>
  );
}
