# Core Data Model (ERD Overview)

Phase 0 models only the **core**: tenancy, identity/RBAC, CMS content, and donations.
Feature domains (LMS, commerce, community, events, library) add their own tables in later
phases — each carrying `tenantId` and following the same isolation rules.

## Entity relationships

```
Tenant 1───* Domain
Tenant 1───1 TenantBranding
Tenant 1───1 TenantConfig
Tenant 1───* User 1───* UserRole *───1 Role
Tenant 1───* Role 1───* RolePermission *───1 Permission   (Permission is global)
Tenant 1───* Content
Tenant 1───* Donor 1───* Donation
Tenant 1───* Donation
```

## Design decisions

- **`tenantId` everywhere.** Every tenant-owned table has a non-null `tenantId` FK with an
  index, and (where relevant) composite unique keys scoped by tenant
  (e.g. `User.email` is unique per tenant, not globally).
- **Money as integers.** `Donation.amount` is in minor units (paise/cents) to avoid
  floating-point rounding errors.
- **JSONB for no-hardcode extension.** `TenantBranding.extra`, `TenantConfig.settings`,
  `Content.body/seo`, `Donation.metadata` allow open-ended, per-tenant data without schema
  changes — backing the "nothing hardcoded" requirement. Typed columns are used for fields
  we query/validate; JSON for the long tail.
- **Permissions are global; roles are per-tenant.** Permission keys (`content:write`,
  `donation:read`) are platform-defined constants; each tenant composes them into its own
  roles. System roles (admin/editor/donor) are seeded but tenants can add custom roles.
- **Content is polymorphic by `type`.** A single `Content` table serves pages, articles,
  programs, projects, stories, and custom types. Block-based body lives in `body` JSON,
  produced by the page builder in a later phase.
- **Cascade vs SetNull.** Deleting a tenant cascades to its data. Deleting a donor sets
  `Donation.donorId` null to preserve financial records.

## Isolation enforcement (not schema, but tied to it)

The schema alone does not prevent cross-tenant reads — that is enforced at runtime by:
1. a Prisma client extension that injects `tenantId` from the request context, and
2. the `TenantIsolationGuard`.
See `MULTI_TENANCY.md`.

## Migrations & seed

- `prisma migrate dev` generates SQL migrations from this schema.
- The seed script creates two demo tenants (`vashundhara`, `demo`) with domains, branding,
  system roles/permissions, an admin user each, sample content, and a sample donation —
  used to demonstrate and test tenant isolation.
