# System Architecture

## 1. Style

**Modular monolith, API-first, event-aware.** One deployable NestJS process composed of
independent feature modules with clear boundaries. Each module owns its domain logic and
exposes APIs. Because modules communicate through service interfaces and (later) a Redis
event bus rather than direct table coupling, any module can be extracted into its own
service without rewriting callers.

```
                ┌─────────────────────────────────────────────┐
   Clients      │  Next.js web · PWA · Mobile · 3rd-party · CLI │
                └───────────────┬─────────────────────────────┘
                                │ REST / GraphQL (+ webhooks)
                ┌───────────────▼─────────────────────────────┐
                │                API (NestJS)                  │
                │  ┌────────────────────────────────────────┐ │
   Cross-cutting│  │ TenantResolution → TenantContext → RBAC │ │
                │  │ Guards · Validation · RateLimit · Audit  │ │
                │  └────────────────────────────────────────┘ │
                │  Feature modules:                            │
                │  tenants · auth · users/rbac · config/brand  │
                │  cms · donations · (lms · commerce · …)      │
                │  Provider adapters: storage·email·ai·payment │
                └───────┬───────────────────────┬─────────────┘
                        │                       │
                 ┌──────▼──────┐         ┌──────▼──────┐
                 │ PostgreSQL  │         │    Redis    │
                 │  (Prisma)   │         │ cache/queue │
                 └─────────────┘         └─────────────┘
```

## 2. Request lifecycle

1. **TenantResolutionMiddleware** derives the tenant from host/subdomain/header and loads
   it (cached in Redis). Unknown host → configurable reject or default tenant (dev).
2. **TenantContext** (request-scoped, AsyncLocalStorage) holds `tenantId` + tenant record.
3. **Auth guard** validates JWT; **RBAC guard** checks role/permission for the route.
4. **TenantIsolationGuard / Prisma middleware** injects `tenantId` into every query and
   blocks any explicit cross-tenant access.
5. Controller → Service → Prisma. Side effects (email, payments) go through adapters.

## 3. Module boundaries

Each feature is a NestJS module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs.
Modules depend on the `PrismaService`, `TenantContext`, and provider tokens — never on
another module's internal repositories. Shared contracts live in `packages/` as they emerge.

## 4. Provider abstraction

External integrations are injected via DI tokens (`STORAGE_PROVIDER`, `EMAIL_PROVIDER`,
`AI_PROVIDER`, `PAYMENT_PROVIDER`). Implementation is chosen from env at boot; per-tenant
overrides (e.g. a tenant's own Razorpay keys) are read from the DB at call time.
See `PROVIDER_ADAPTERS.md`.

## 5. Deployment topologies

- **Dev / small VPS:** one API container + Postgres + Redis (docker-compose).
- **Scale-out:** multiple stateless API replicas behind a load balancer; Redis + Postgres
  managed/clustered; BullMQ workers for async jobs.
- **Microservices (later):** extract a module (e.g. LMS) into its own service that reuses
  the same tenant-context contract and event bus.

## 6. Data strategy

Single database, shared schema, **discriminator column (`tenantId`)** on every tenant-owned
table, enforced centrally. This is the most operationally simple model for unlimited
tenants; schema-per-tenant or DB-per-tenant can be introduced later for large/regulated
tenants without changing application code (the isolation layer abstracts it).
See `MULTI_TENANCY.md` for the trade-off analysis.

## 7. Cross-cutting concerns

- **Config:** typed, validated env at boot (`@nestjs/config` + schema validation).
- **Security:** Helmet, CORS allow-list, rate limiting, class-validator on all DTOs,
  Prisma parameterized queries, audit-log hooks on mutations.
- **Observability:** structured JSON logs with `tenantId`/`requestId`, `/health`.
- **Events:** Redis/BullMQ for async work (receipts, emails, webhooks) — added in Phase 1.
