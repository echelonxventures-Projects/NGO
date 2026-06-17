/**
 * Fail-fast validation of critical environment variables at boot.
 * Keeps misconfiguration from surfacing as confusing runtime errors later.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = (config.NODE_ENV as string) ?? 'development';
  const errors: string[] = [];

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Provider-specific requirements (only enforced for the selected provider).
  if ((config.EMAIL_PROVIDER as string) === 'smtp' && !config.SMTP_HOST) {
    errors.push('SMTP_HOST is required when EMAIL_PROVIDER=smtp');
  }
  if ((config.STORAGE_PROVIDER as string) === 's3' && !config.S3_BUCKET) {
    errors.push('S3_BUCKET is required when STORAGE_PROVIDER=s3');
  }

  if (env === 'production') {
    const secret = config.JWT_SECRET as string | undefined;
    if (!secret || secret.length < 24 || secret.includes('change-me')) {
      errors.push('JWT_SECRET must be a strong, non-default value in production');
    }
    if (!config.PLATFORM_BASE_DOMAIN) {
      errors.push('PLATFORM_BASE_DOMAIN is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }

  return config;
}
