# DXP API image. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t dxp-api .
# Multi-stage: install+build with dev deps, then a slim runtime with prod deps only.

# ---------- deps + build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Workspace manifests first for cached installs.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Source + Prisma schema, then generate client and compile.
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=@dxp/api \
  && npm run build --workspace=@dxp/api

# Prune dev dependencies for the runtime image.
RUN npm prune --omit=dev --workspace=@dxp/api

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root runtime user.
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

USER app
WORKDIR /app/apps/api
EXPOSE 4000

# Apply pending migrations, then start. Migrations are idempotent (deploy = no prompts).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
