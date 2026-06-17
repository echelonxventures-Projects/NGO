import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LiveRecurrence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { LIVECLASS_PORT, LiveClassPort } from '../providers/liveclass/liveclass.port';
import { CreateLiveSessionDto, UpdateLiveStatusDto } from './dto/liveclass.dto';

/**
 * Live class scheduling + attendance. A session provisions a room via the LIVECLASS_PORT
 * (Jitsi by default), supports one-time/recurring schedules, tracks join/leave attendance and
 * stores a recording URL when available.
 */
@Injectable()
export class LiveClassService {
  constructor(
    @Inject(LIVECLASS_PORT) private readonly live: LiveClassPort,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async schedule(hostId: string, dto: CreateLiveSessionDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const room = await this.live.createRoom({
      title: dto.title,
      hostName: dto.hostName,
    });
    return this.prisma.scoped().liveSession.create({
      data: {
        tenantId,
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        provider: room.provider,
        roomName: room.roomName,
        joinUrl: room.joinUrl,
        hostId,
        hostName: dto.hostName,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin ?? 60,
        recurrence: (dto.recurrence as LiveRecurrence) ?? 'NONE',
      },
    });
  }

  upcoming(courseId?: string) {
    return this.prisma.scoped().liveSession.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LIVE'] },
        ...(courseId ? { courseId } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async get(id: string) {
    const session = await this.prisma.scoped().liveSession.findFirst({
      where: { id },
      include: { _count: { select: { attendance: true } } },
    });
    if (!session) throw new NotFoundException('Live session not found');
    return session;
  }

  async setStatus(id: string, dto: UpdateLiveStatusDto) {
    await this.get(id);
    return this.prisma.scoped().liveSession.update({
      where: { id },
      data: {
        status: dto.status,
        recordingUrl: dto.recordingUrl ?? undefined,
        startedAt: dto.status === 'LIVE' ? new Date() : undefined,
        endedAt: dto.status === 'ENDED' ? new Date() : undefined,
      },
    });
  }

  /** Records (idempotently) a participant joining; returns the join URL. */
  async join(id: string, userId: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const session = await this.get(id);
    await this.prisma.scoped().liveAttendance.upsert({
      where: { sessionId_userId: { sessionId: id, userId } },
      create: { tenantId, sessionId: id, userId },
      update: {},
    });
    return { joinUrl: session.joinUrl, roomName: session.roomName, provider: session.provider };
  }

  async leave(id: string, userId: string) {
    await this.prisma.scoped().liveAttendance.updateMany({
      where: { sessionId: id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
    return { ok: true };
  }

  attendance(id: string) {
    return this.prisma.scoped().liveAttendance.findMany({
      where: { sessionId: id },
      orderBy: { joinedAt: 'asc' },
    });
  }
}
