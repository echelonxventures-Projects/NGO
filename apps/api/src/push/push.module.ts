import { Injectable } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Module } from '@nestjs/common';
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { Public } from '../auth/public.decorator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

export class SubscribeDto {
  @IsString() endpoint!: string;
  @IsObject() keys!: { p256dh: string; auth: string };
  @IsOptional() @IsString() userAgent?: string;
}

/**
 * Stores Web Push (PushManager) subscriptions per tenant/user. A real sender (web-push +
 * VAPID) plugs into the notifications PUSH channel later; persistence + management are here so
 * the PWA can subscribe today. Free-first: no external service required to capture subs.
 */
@Injectable()
export class PushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  subscribe(dto: SubscribeDto, userId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.scoped().pushSubscription.upsert({
      where: { tenantId_endpoint: { tenantId, endpoint: dto.endpoint } },
      create: {
        tenantId,
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent,
      },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.scoped().pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  }

  list(userId: string) {
    return this.prisma.scoped().pushSubscription.findMany({ where: { userId } });
  }
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Public()
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() me?: AuthUser) {
    return this.push.subscribe(dto, me?.userId);
  }

  @Public()
  @Post('unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.push.unsubscribe(body.endpoint);
  }

  @Get('subscriptions')
  list(@CurrentUser() me: AuthUser) {
    return this.push.list(me.userId);
  }
}

@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
