/**
 * Centralized, env-driven configuration. Nothing is hardcoded in feature code;
 * everything is read from here, which in turn reads validated environment variables.
 */
export interface AppConfig {
  env: string;
  port: number;
  host: string;
  corsOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  tenancy: {
    baseDomain: string;
    defaultTenantSlug: string | null;
    tenantHeader: string;
  };
  providers: {
    storage: string;
    email: string;
    ai: string;
    payment: string;
    fx: string;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '4000', 10),
  host: process.env.API_HOST ?? '0.0.0.0',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '3600s',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  tenancy: {
    baseDomain: process.env.PLATFORM_BASE_DOMAIN ?? 'platform.local',
    // Empty string => strict mode (no default tenant fallback).
    defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG?.trim() || null,
    tenantHeader: (process.env.TENANT_HEADER ?? 'x-tenant').toLowerCase(),
  },
  providers: {
    storage: process.env.STORAGE_PROVIDER ?? 'local',
    email: process.env.EMAIL_PROVIDER ?? 'log',
    ai: process.env.AI_PROVIDER ?? 'ollama',
    payment: process.env.PAYMENT_PROVIDER ?? 'mock',
    fx: process.env.FX_PROVIDER ?? 'seeded',
  },
});
