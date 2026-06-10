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
