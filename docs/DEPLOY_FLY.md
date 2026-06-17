# Deploying to Fly.io (free-first)

This deploys the two apps in this monorepo as separate Fly.io apps:

| Fly app   | Source            | Port | Config         |
|-----------|-------------------|------|----------------|
| `dxp-api` | `apps/api` (NestJS)| 4000 | `fly.api.toml` |
| `dxp-web` | `apps/web` (Next) | 3000 | `fly.web.toml` |

Both are deployed from the **repo root** because the Dockerfiles use the root as their
build context (npm workspaces).

## Honest cost note (read first)

Fly.io **no longer has a permanent free tier**. New accounts get a limited free trial
(≈$5 credit / ~2 hours of machine runtime / 7 days), then a card is required and you pay
per usage. To keep this effectively free / near-zero:

- Both apps use **`auto_stop_machines` + `min_machines_running = 0`** → machines scale to
  zero when idle, so you only burn compute while serving requests (cold start is a few
  seconds). This is already set in the `fly.*.toml` files.
- Use a **free external Postgres** (Neon or Supabase free tier) instead of paid Fly
  Managed Postgres — the app only needs a `DATABASE_URL`. See step 3.
- **Redis is optional**: the API connects lazily and degrades gracefully if `REDIS_URL`
  is unset (rate limiting falls back to an in-memory store). Add Upstash later if you
  need shared caching across machines.

## 0. Prerequisites

```bash
# Install flyctl and sign in
curl -L https://fly.io/install.sh | sh
fly auth signup   # or: fly auth login
```

## 1. Create the two apps (without deploying yet)

```bash
# from the repo root
fly apps create dxp-api
fly apps create dxp-web
```

If you pick different names, update `app = "..."` in both toml files and the
`NEXT_PUBLIC_API_URL` references below.

## 2. Provision a database

**Option A — free external Postgres (recommended for "free"):**
Create a free DB at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com),
copy its connection string (must include `?sslmode=require`), and set it as a secret in step 4.

**Option B — Fly Managed Postgres (paid, ~$/mo for storage + compute):**
```bash
fly mpg create            # follow prompts; then attach to get a DATABASE_URL secret
fly mpg attach <pg-name> --app dxp-api
```

## 3. (Optional) Redis via Upstash

```bash
fly redis create          # creates an Upstash Redis; copy the redis:// URL
# then set it as a secret in step 4 (omit entirely to run without Redis)
```

## 4. Set API secrets

Never commit these. Generate a strong JWT secret.

```bash
JWT=$(openssl rand -hex 32)

fly secrets set --app dxp-api \
  DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require" \
  JWT_SECRET="$JWT" \
  CORS_ORIGINS="https://dxp-web.fly.dev" \
  PUBLIC_WEB_URL="https://dxp-web.fly.dev" \
  PLATFORM_BASE_DOMAIN="fly.dev"
# Optional:
#   REDIS_URL="redis://...upstash..."
#   DEFAULT_TENANT_SLUG="vashundhara"   # dev convenience; leave unset for strict tenancy
```

## 5. Deploy the API

```bash
# from the repo root — release_command runs `prisma migrate deploy` automatically
fly deploy --config fly.api.toml --dockerfile apps/api/Dockerfile

# verify
curl https://dxp-api.fly.dev/api/health
# Swagger: https://dxp-api.fly.dev/api/docs   (restrict/disable before a real launch)
```

## 6. Seed demo tenants (once)

The release step applies migrations but does not seed. Run the seed inside a one-off
machine that has the API image + DATABASE_URL:

```bash
fly ssh console --app dxp-api --command "npm --workspace=@dxp/api run prisma:seed"
```

> `ts-node` and the dev seed script must be present in the image. If the slim runtime
> image has pruned them, instead run the seed locally against the same `DATABASE_URL`:
> `DATABASE_URL="<prod url>" npm --workspace=@dxp/api run prisma:seed`

## 7. Deploy the Web app

`NEXT_PUBLIC_API_URL` is baked at build time, so pass it as a build arg (it's also set
as a default in `fly.web.toml`):

```bash
fly deploy --config fly.web.toml --dockerfile apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://dxp-api.fly.dev/api

open https://dxp-web.fly.dev
```

## 8. Custom domains (optional)

```bash
fly certs add www.your-ngo.org --app dxp-web
fly certs add api.your-ngo.org --app dxp-api
# then point DNS (A/AAAA or CNAME) at the values fly prints, and update
# CORS_ORIGINS / NEXT_PUBLIC_API_URL / PLATFORM_BASE_DOMAIN accordingly.
```

## Updating

```bash
fly deploy --config fly.api.toml --dockerfile apps/api/Dockerfile
fly deploy --config fly.web.toml --dockerfile apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://dxp-api.fly.dev/api
```

## Troubleshooting

- `fly logs --app dxp-api` / `fly logs --app dxp-web` — live logs.
- `fly status --app dxp-api` — machine state (a stopped machine is normal when idle).
- Health shows `"redis":"down"` but `status` is still returned — expected when running
  without Redis; the app remains functional.
- Web shows API errors → check `CORS_ORIGINS` (API) and `NEXT_PUBLIC_API_URL` (rebuild
  web if you change it; it is build-time, not runtime).
- Migrations didn't apply → check the release step output in `fly logs`, or run
  `fly ssh console --app dxp-api --command "npx prisma migrate deploy"`.

## Production caveats (see docs/COVERAGE_MATRIX.md gap review)

This makes the platform *reachable*, not *production-complete*. Before real users/money:
payments are still the **mock** adapter; SMS/Push notifications are log-only; there is no
job queue for recurring charges; and Swagger is publicly exposed. Address those before a
real launch.
