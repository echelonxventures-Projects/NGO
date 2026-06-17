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
    liveclass: string;
    translation: string;
    speech: string;
  };
  storage: {
    localPath: string;
    publicBaseUrl: string;
    s3: {
      endpoint: string | null;
      region: string;
      bucket: string;
      accessKey: string;
      secretKey: string;
    };
  };
  email: {
    from: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    };
  };
  ai: {
    ollama: { baseUrl: string; model: string };
    openai: { apiKey: string; baseUrl: string; model: string };
    gemini: { apiKey: string; model: string };
    anthropic: { apiKey: string; model: string; version: string };
    openrouter: { apiKey: string; baseUrl: string; model: string };
    deepseek: { apiKey: string; baseUrl: string; model: string };
    mistral: { apiKey: string; baseUrl: string; model: string };
  };
  liveclass: { jitsiBaseUrl: string };
  translation: { libreUrl: string; libreApiKey: string };
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
    ai: process.env.AI_PROVIDER ?? 'echo',
    payment: process.env.PAYMENT_PROVIDER ?? 'mock',
    fx: process.env.FX_PROVIDER ?? 'seeded',
    liveclass: process.env.LIVECLASS_PROVIDER ?? 'jitsi',
    translation: process.env.TRANSLATION_PROVIDER ?? 'echo',
    speech: process.env.SPEECH_PROVIDER ?? 'stub',
  },
  storage: {
    localPath: process.env.STORAGE_LOCAL_PATH ?? './storage/uploads',
    // Base URL prefix returned for stored objects (served by StorageController).
    publicBaseUrl: (process.env.STORAGE_PUBLIC_BASE_URL ?? '/api/storage/files').replace(/\/$/, ''),
    s3: {
      endpoint: process.env.S3_ENDPOINT?.trim() || null,
      region: process.env.S3_REGION ?? 'us-east-1',
      bucket: process.env.S3_BUCKET ?? '',
      accessKey: process.env.S3_ACCESS_KEY ?? '',
      secretKey: process.env.S3_SECRET_KEY ?? '',
    },
  },
  email: {
    from: process.env.EMAIL_FROM ?? 'no-reply@platform.local',
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      // SMTPS (implicit TLS) on 465; STARTTLS otherwise.
      secure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true'
        || (process.env.SMTP_PORT ?? '') === '465',
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
    },
  },
  ai: {
    ollama: {
      baseUrl: process.env.AI_OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.AI_OLLAMA_MODEL ?? 'llama3',
    },
    openai: {
      apiKey: process.env.AI_OPENAI_API_KEY ?? '',
      baseUrl: process.env.AI_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.AI_OPENAI_MODEL ?? 'gpt-4o-mini',
    },
    gemini: {
      apiKey: process.env.AI_GEMINI_API_KEY ?? '',
      model: process.env.AI_GEMINI_MODEL ?? 'gemini-1.5-flash',
    },
    anthropic: {
      apiKey: process.env.AI_ANTHROPIC_API_KEY ?? '',
      model: process.env.AI_ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      version: process.env.AI_ANTHROPIC_VERSION ?? '2023-06-01',
    },
    openrouter: {
      apiKey: process.env.AI_OPENROUTER_API_KEY ?? '',
      baseUrl: process.env.AI_OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model: process.env.AI_OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
    },
    deepseek: {
      apiKey: process.env.AI_DEEPSEEK_API_KEY ?? '',
      baseUrl: process.env.AI_DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
      model: process.env.AI_DEEPSEEK_MODEL ?? 'deepseek-chat',
    },
    mistral: {
      apiKey: process.env.AI_MISTRAL_API_KEY ?? '',
      baseUrl: process.env.AI_MISTRAL_BASE_URL ?? 'https://api.mistral.ai/v1',
      model: process.env.AI_MISTRAL_MODEL ?? 'mistral-small-latest',
    },
  },
  liveclass: {
    jitsiBaseUrl: process.env.LIVECLASS_JITSI_BASE_URL ?? 'https://meet.jit.si',
  },
  translation: {
    libreUrl: process.env.LIBRETRANSLATE_URL ?? 'https://libretranslate.com',
    libreApiKey: process.env.LIBRETRANSLATE_API_KEY ?? '',
  },
});
