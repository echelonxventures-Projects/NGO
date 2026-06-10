import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

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
    // Global infrastructure
    RedisModule,
    TenancyModule,
    PrismaModule,
    AuthModule,
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
  ],
  providers: [
    // Order matters: authenticate → enforce tenant isolation → check permissions.
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
