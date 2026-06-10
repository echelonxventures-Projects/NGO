# Product Requirements Document (PRD)

## 1. Vision

A multi-tenant, white-label, API-first Digital Experience Platform (DXP) that lets any
organization — NGOs, foundations, institutes, CSR programs, businesses — run their
website, programs, donations, learning, commerce, and community **without code changes**.
Vashundhara Foundation is the first tenant and reference implementation.

## 2. Principles (non-negotiable)

1. **No hardcoding.** Org names, domains, branding, menus, forms, workflows, and every
   external provider (payment, storage, AI, email, SMS) are data/config-driven.
2. **Multi-tenant by default.** Every domain object carries a `tenantId`; isolation is
   enforced centrally, not per-feature.
3. **API-first & headless.** Every capability is a documented API; UIs are clients.
4. **Provider abstraction.** External services sit behind adapter interfaces with
   free-first defaults (local storage, SMTP, Ollama) and swappable implementations.
5. **Deploy anywhere.** Single-process monolith → modular monolith → microservices,
   on a VPS or Kubernetes, with no rewrite.
6. **Free-first.** The platform must run end-to-end with zero paid services.

## 3. Personas

- **Platform Operator** — runs the SaaS, onboards tenants, manages plans/billing.
- **Tenant Admin** — configures branding, domains, users, content, modules.
- **Staff / Editor** — manages CMS content, programs, donations, courses.
- **End User** — donor, student, customer, community member, volunteer.
- **Developer** — integrates via REST/GraphQL APIs and webhooks.

## 4. Scope by phase (see ROADMAP.md for detail)

- **Phase 0 (this repo):** Tenancy, isolation, RBAC, no-hardcode config/branding,
  CMS + Donations skeletons, provider-adapter pattern, runnable API + DB + infra.
- **Phase 1 (NGO MVP):** Donations (one-time/recurring), receipts/80G, CMS pages,
  tenant branding, basic admin, Next.js public site.
- **Phase 2+:** LMS, commerce/marketplace, community, events, volunteers, live classes,
  digital-library federation, AI layer, ads, mobile/PWA.

## 5. Functional requirements (Phase 0 acceptance)

- Resolve tenant from host/subdomain/header; reject unknown hosts (configurable fallback).
- Persist tenants, domains, users, roles, permissions, content, donations.
- Enforce that a user/request cannot read or write another tenant's data.
- Expose tenant branding/config via API with safe per-tenant overrides.
- Create a donation intent through a swappable payment adapter (mock by default).
- Health endpoint reporting DB and Redis connectivity.

## 6. Non-functional requirements

- **Security:** RBAC, JWT auth, rate limiting, input validation, audit log hooks,
  CSRF/XSS/SQLi defenses (validation + ORM parameterization).
- **SEO (frontend phase):** SSR/SSG, sitemaps, structured data.
- **Accessibility (frontend phase):** WCAG 2.2 AA target.
- **Observability:** structured logs, health/readiness, metrics hooks.
- **Performance:** stateless API, Redis caching for tenant/config lookups.

## 7. Out of scope for Phase 0

Full LMS/commerce/community feature sets, mobile apps, real-time AI dubbing,
live-class WebRTC infrastructure, ad server. These are layered on later and must not
require changing the tenancy/isolation/config core built here.
