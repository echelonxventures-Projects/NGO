import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './security/gql-throttler.guard';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';

import { TenancyModule } from './tenancy/tenancy.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { BrandingModule } from './branding/branding.module';
import { CmsModule } from './cms/cms.module';
import { DonationsModule } from './donations/donations.module';
import { CurrencyModule } from './currency/currency.module';
import { TaxModule } from './tax/tax.module';
import { CertificateModule } from './certificates/certificate.module';
import { ReceiptModule } from './receipts/receipt.module';
import { DomainModule } from './domains/domain.module';
import { UsersModule } from './users/users.module';
import { LmsModule } from './lms/lms.module';
import { CommerceModule } from './commerce/commerce.module';
import { EngagementModule } from './engagement/engagement.module';
import { StorageModule } from './providers/storage/storage.module';
import { EmailModule } from './providers/email/email.module';
import { AiProviderModule } from './providers/ai/ai-provider.module';
import { NotificationModule } from './notifications/notification.module';
import { AiModule } from './ai/ai.module';
import { LibraryModule } from './library/library.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { QrModule } from './common/qr/qr.module';
import { LiveClassProviderModule } from './providers/liveclass/liveclass-provider.module';
import { LiveClassModule } from './liveclass/liveclass.module';
import { AdsModule } from './ads/ads.module';
import { DeepLinkModule } from './deeplinks/deeplink.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { CrmModule } from './crm/crm.module';
import { WebsiteModule } from './website/website.module';
import { SeoModule } from './seo/seo.module';
import { GraphqlGatewayModule } from './graphql/graphql.module';
import { PushModule } from './push/push.module';
import { TranslationProviderModule } from './providers/translation/translation-provider.module';
import { SpeechProviderModule } from './providers/speech/speech-provider.module';
import { MultilingualModule } from './multilingual/multilingual.module';

import { TenantResolutionMiddleware } from './tenancy/tenant-resolution.middleware';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/rbac/permissions.guard';
import { TenantIsolationGuard } from './tenancy/tenant-isolation.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Rate limiting: default 120 requests / 60s per IP (free-first, in-memory store).
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
        limit: parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10),
      },
    ]),
    // Global infrastructure
    RedisModule,
    TenancyModule,
    PrismaModule,
    AuthModule,
    QrModule,
    SecurityModule,
    // Global provider adapters (storage/email/ai) — available everywhere
    StorageModule,
    EmailModule,
    AiProviderModule,
    LiveClassProviderModule,
    TranslationProviderModule,
    SpeechProviderModule,
    NotificationModule,
    // Features
    HealthModule,
    BrandingModule,
    CmsModule,
    DonationsModule,
    CurrencyModule,
    TaxModule,
    CertificateModule,
    ReceiptModule,
    DomainModule,
    UsersModule,
    LmsModule,
    CommerceModule,
    EngagementModule,
    AiModule,
    LibraryModule,
    MarketplaceModule,
    LiveClassModule,
    AdsModule,
    DeepLinkModule,
    AnalyticsModule,
    CrmModule,
    WebsiteModule,
    SeoModule,
    GraphqlGatewayModule,
    PushModule,
    MultilingualModule,
  ],
  providers: [
    // Rate limit first, then authenticate → enforce tenant isolation → check permissions.
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantIsolationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve tenant for every route except health (which must work pre-seed).
    consumer
      .apply(TenantResolutionMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'donations/webhook', method: RequestMethod.POST },
        { path: 'api/donations/webhook', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
