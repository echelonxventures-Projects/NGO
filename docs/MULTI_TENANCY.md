# Multi-Tenancy & Isolation Model

## 1. Tenant resolution order

For each request, the tenant is resolved in this precedence:

1. **Trusted header** (`TENANT_HEADER`, default `x-tenant`) — only honored for internal/
   server-to-server calls (gateway-stripped from public traffic). Used by jobs and tests.
2. **Custom domain** — exact match on `Domain.hostname` (e.g. `vashundharafoundation.org`).
3. **Subdomain** of `PLATFORM_BASE_DOMAIN` — `<slug>.platform.local` → tenant `slug`.
4. **Default tenant** (`DEFAULT_TENANT_SLUG`) — dev convenience only; disabled when empty.

If none match → `404 Tenant not found` (no data leaks, no default in prod).

Resolved tenants are cached in Redis (`tenant:host:<host>`) with a short TTL and
invalidated when a tenant's domains change.

## 2. Isolation model: shared DB, `tenantId` discriminator

Every tenant-owned table has a non-null `tenantId` FK to `Tenant`. Isolation is enforced
in **two layers** so a single forgotten `where` clause cannot leak data:

1. **Prisma client extension / middleware** auto-injects `tenantId` from `TenantContext`
   into `findMany/findFirst/update/delete/count` and sets it on `create`. Models in an
   allow-list (global/platform tables) are exempt.
2. **TenantIsolationGuard** rejects any request whose authenticated user's `tenantId`
   differs from the resolved tenant, and validates that path/body `tenantId`s (if present)
   match the context.

`TenantContext` uses Node `AsyncLocalStorage`, so the `tenantId` is available everywhere in
the call chain without threading it through every function signature.

## 3. Why shared-DB discriminator (trade-offs)

| Model | Isolation | Ops cost | Scale to many tenants | Per-tenant customization |
|-------|-----------|----------|-----------------------|--------------------------|
| **Shared DB + tenantId (chosen)** | Logical | Lowest | Excellent | Good (config/JSONB) |
| Schema-per-tenant | Stronger | Medium | Hundreds | Good |
| DB-per-tenant | Strongest | Highest | Limited | Strongest |

We start with shared-DB for unlimited small/medium tenants. The isolation layer hides the
physical model, so a large or regulated tenant can later be migrated to its own
schema/DB **without application changes**.

## 4. Identity & membership

A `User` belongs to exactly one tenant in Phase 0 (simplest, safest). Cross-tenant
identity (one human, many orgs) is modeled later via a `Membership` join without breaking
existing rows. Platform operators are a special tenant-less role gated separately.

## 5. Per-tenant configuration & branding

Tenant settings (name, tagline, logos, colors, fonts, menus, social links, feature flags,
provider overrides) live in `TenantConfig`/`TenantBranding` rows with typed columns for
common fields and a `JSONB settings` blob for open-ended, no-hardcode extension. The API
exposes a public read endpoint so any frontend can theme itself from data.

## 6. Testing isolation (Phase 0 acceptance)

- Seed two tenants; assert tenant A's token cannot read tenant B's content/donations.
- Assert queries without context throw rather than returning all-tenant data.
- Assert unknown host → 404 in non-dev.
