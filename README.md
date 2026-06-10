# DXP Platform

A multi-tenant, white-label, API-first **Digital Experience Platform**.
First tenant / reference implementation: **Vashundhara Foundation**. The platform
supports unlimited organizations (NGOs, institutes, foundations, businesses) with
**no code changes** — everything (branding, domains, config, providers) is data-driven.

> **Status: Phase 0 — Foundation.** This repo currently contains the architecture,
> core data model, and a runnable backend skeleton proving the hard parts:
> tenant resolution, tenant isolation, RBAC, and no-hardcode config/branding,
> plus donations + CMS skeletons. See `docs/ROADMAP.md` for what comes next and
> the realistic scope. The full vision (LMS, commerce, live classes, AI dubbing,
> mobile apps, etc.) is built module-by-module on top of this foundation.

## Stack

| Concern        | Choice                                      |
|----------------|---------------------------------------------|
| Backend        | NestJS (TypeScript), modular monolith       |
| Database       | PostgreSQL + Prisma                         |
| Cache / Jobs   | Redis + BullMQ                              |
| Frontend       | Next.js (App Router) — *added in a later phase* |
| Auth / SSO     | Local JWT now → Keycloak adapter later      |
| Storage / AI / Email / Payments | Provider adapters (free-first defaults) |
| Deploy         | Docker Compose → Kubernetes-ready           |

## Repository layout

```
apps/
  api/            NestJS backend (modular monolith)
packages/         shared libraries (added as needed)
infra/            docker-compose and infra config
docs/             PRD, architecture, tenancy model, adapters, roadmap
```

## Quick start

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Start Postgres + Redis
npm run infra:up

# 3. Configure env (the API reads apps/api/.env)
cp .env.example apps/api/.env

# 4. Generate Prisma client, run migrations, seed two demo tenants
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 5. Run the API (http://localhost:4000)
npm run api:dev
```

Health check: `GET http://localhost:4000/api/health`

> Postgres is mapped to host port **5433** (to avoid clashing with a local Postgres on
> 5432). Seeded tenants: `vashundhara` and `demo`; default admin logins
> `admin@vashundhara.org` / `admin@demo.org`, password `Password123!`.

### Try it (proves tenancy, RBAC, isolation, donations)

```bash
API=http://localhost:4000/api
# Public, per-tenant branding (no-hardcode theming source)
curl -H 'x-tenant: vashundhara' $API/branding

# Login → token
curl -H 'x-tenant: vashundhara' -H 'Content-Type: application/json' \
  -d '{"email":"admin@vashundhara.org","password":"Password123!"}' $API/auth/login

# Public donation via the (mock) payment adapter
curl -H 'x-tenant: vashundhara' -H 'Content-Type: application/json' \
  -d '{"amount":50000,"currency":"INR","donorEmail":"a@b.org"}' $API/donations
```

## Multi-tenancy at a glance

A request's tenant is resolved from (in order): trusted `x-tenant` header →
custom domain → subdomain of `PLATFORM_BASE_DOMAIN` → `DEFAULT_TENANT_SLUG` (dev only).
The resolved tenant is attached to a request-scoped context; every data query is
scoped by `tenantId`, and an isolation guard rejects cross-tenant access.
See `docs/MULTI_TENANCY.md`.

## Documentation

- `docs/PRD.md` — product requirements & scope
- `docs/ARCHITECTURE.md` — system architecture
- `docs/MULTI_TENANCY.md` — tenancy & isolation model
- `docs/PROVIDER_ADAPTERS.md` — the no-hardcode provider pattern
- `docs/DATA_MODEL.md` — core ERD overview
- `docs/ROADMAP.md` — phased delivery plan
