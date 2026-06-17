# Deployment Guide

The platform is a NestJS API + Next.js web app backed by PostgreSQL and Redis. It follows a
**free-first** policy: every default provider is open-source/self-hostable with no paid keys.

## Deployment options

| Mode | How |
|---|---|
| Local dev | `npm run infra:up` (Postgres+Redis), then `npm run api:dev` / `npm run --workspace=@dxp/web dev` |
| Single-host (Docker Compose) | `docker compose -f infra/docker-compose.prod.yml up -d --build` |
| Containerized (k8s/VPS) | Build the two images and run them behind a reverse proxy |
| Self-hosted | Same images; point `DATABASE_URL`/`REDIS_URL` at your instances |

## Build the images

```bash
# From the repo root (build context = root for workspace installs)
docker build -f apps/api/Dockerfile -t dxp-api .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.org/api -t dxp-web .
```

## One-command stack

```bash
cp .env.example apps/api/.env   # then edit secrets
docker compose -f infra/docker-compose.prod.yml up -d --build
# API → http://localhost:4000/api  (Swagger at /api/docs, GraphQL at /graphql)
# Web → http://localhost:3000
```

The API container runs `prisma migrate deploy` on start (idempotent), so the schema is applied
automatically. Seed demo tenants once with `npm run prisma:seed` (or run it inside the api container).

## Required environment

Minimum for production (see `.env.example` for the full list):

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — strong random secret (do **not** use the dev default)
- `CORS_ORIGINS` — comma-separated allowed web origins
- `PLATFORM_BASE_DOMAIN` — base domain for tenant subdomains

### Optional provider switches (all default to free-first)

| Concern | Var | Default | Upgrade |
|---|---|---|---|
| AI | `AI_PROVIDER` | `echo` | `ollama` (local) / `openai` / `gemini` / `anthropic` / `openrouter` / `deepseek` / `mistral` |
| Storage | `STORAGE_PROVIDER` | `local` | `s3` (MinIO-compatible) |
| Email | `EMAIL_PROVIDER` | `log` | `smtp` |
| Live class | `LIVECLASS_PROVIDER` | `jitsi` | self-hosted Jitsi via `LIVECLASS_JITSI_BASE_URL` |
| Translation | `TRANSLATION_PROVIDER` | `echo` | `libretranslate` (self-hosted) |
| Speech | `SPEECH_PROVIDER` | `stub` | Whisper/Piper/Coqui |
| FX | `FX_PROVIDER` | `seeded` | `frankfurter` |

## CI/CD

`.github/workflows/ci.yml` runs install → prisma generate → typecheck → build → test on every
push/PR. Extend it with an image build/publish step for your registry, then deploy.

## Monitoring & logging

- Health: `GET /api/health` (checks DB + Redis) — wire to your uptime/orchestrator probes.
- Logs: structured Nest logger to stdout (collect via your platform's log driver).
- Audit: mutating requests recorded in `audit_logs` (queryable at `/api/audit-logs`).
- Rate limiting: 120 req/60s per IP by default (`RATE_LIMIT_MAX` / `RATE_LIMIT_TTL_MS`).

## Backup & disaster recovery

- **Postgres**: schedule `pg_dump` (or managed snapshots); the `dxp_pgdata` volume is the source of truth.
- **Storage**: when using local disk, back up the `STORAGE_LOCAL_PATH` volume; with S3/MinIO use bucket versioning.
- **Restore**: provision a fresh stack, restore the DB dump, then `prisma migrate deploy` brings the schema current.

---

# Production Launch Checklist

- [ ] `JWT_SECRET` set to a strong unique value (not the dev default)
- [ ] `DATABASE_URL` / `REDIS_URL` point at production instances; backups scheduled
- [ ] `CORS_ORIGINS` restricted to your real web origins
- [ ] TLS terminated at a reverse proxy/load balancer (HTTPS only)
- [ ] `prisma migrate deploy` applied; demo seed data removed for real tenants
- [ ] Provider keys configured for any non-free providers you enable
- [ ] Rate limits reviewed for expected traffic
- [ ] Health checks wired to the orchestrator; alerting configured
- [ ] Log collection + retention configured
- [ ] Audit-log retention/rotation policy decided
- [ ] Backup + restore drill performed at least once
- [ ] Swagger (`/api/docs`) access restricted or disabled if not public
- [ ] First tenant created with branding, domain mapping verified
