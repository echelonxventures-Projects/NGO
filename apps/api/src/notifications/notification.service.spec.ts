import { NotificationChannel } from '@prisma/client';
import { NotificationService } from './notification.service';
import { ChannelResult, NotificationChannelPort } from './notification-channel.port';

function fakeChannel(
  channel: NotificationChannel,
  result?: Partial<ChannelResult>,
  throws = false,
): NotificationChannelPort & { send: jest.Mock } {
  return {
    channel,
    send: jest.fn(async () => {
      if (throws) throw new Error('boom');
      return { channel, status: 'sent', ...result } as ChannelResult;
    }),
  };
}

function build(channels: NotificationChannelPort[]) {
  const create = jest.fn().mockResolvedValue({ id: 'n1' });
  const updateMany = jest.fn().mockResolvedValue({ count: 2 });
  const count = jest.fn().mockResolvedValue(3);
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma = {
    scoped: () => ({ notification: { create, updateMany, count, findMany } }),
  } as any;
  const tenantContext = { requireTenantId: jest.fn().mockReturnValue('t1') } as any;
  const svc = new NotificationService(channels as any, prisma, tenantContext);
  return { svc, create, updateMany, count, findMany };
}

describe('NotificationService.notify', () => {
  it('fans out to the requested channels and persists one row each', async () => {
    const inApp = fakeChannel(NotificationChannel.IN_APP);
    const email = fakeChannel(NotificationChannel.EMAIL, { ref: 'msg1' });
    const { svc, create } = build([inApp, email]);

    const results = await svc.notify({
      type: 'user.welcome',
      title: 'Hi',
      body: 'Welcome',
      userId: 'u1',
      to: 'u1@example.org',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });

    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
    expect(results.map((r) => r.status)).toEqual(['sent', 'sent']);
    // IN_APP result took its ref from the persisted row id.
    expect(results[0].ref).toBe('n1');
    expect(results[1].ref).toBe('msg1');
  });

  it('derives default channels: IN_APP for a user + EMAIL for an @ address', async () => {
    const inApp = fakeChannel(NotificationChannel.IN_APP);
    const email = fakeChannel(NotificationChannel.EMAIL);
    const { svc } = build([inApp, email]);

    await svc.notify({ type: 't', title: 'x', body: 'y', userId: 'u1', to: 'u1@x.org' });

    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledTimes(1);
  });

  it('isolates a failing channel: records FAILED but still processes others', async () => {
    const bad = fakeChannel(NotificationChannel.PUSH, undefined, true);
    const good = fakeChannel(NotificationChannel.IN_APP);
    const { svc, create } = build([bad, good]);

    const results = await svc.notify({
      type: 't',
      title: 'x',
      body: 'y',
      userId: 'u1',
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    });

    expect(results[0]).toMatchObject({ channel: NotificationChannel.PUSH, status: 'failed' });
    expect(results[1].status).toBe('sent');
    // The failed-channel row is persisted with FAILED status.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('records FAILED when no adapter is registered for a requested channel', async () => {
    const { svc, create } = build([fakeChannel(NotificationChannel.IN_APP)]);
    const results = await svc.notify({
      type: 't',
      title: 'x',
      body: 'y',
      channels: [NotificationChannel.SMS],
    });
    expect(results[0]).toMatchObject({ status: 'failed' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ channel: NotificationChannel.SMS }) }),
    );
  });
});

describe('NotificationService inbox', () => {
  it('markRead returns the number of rows updated', async () => {
    const { svc, updateMany } = build([]);
    const res = await svc.markRead('n1', 'u1');
    expect(updateMany).toHaveBeenCalled();
    expect(res).toEqual({ updated: 2 });
  });

  it('unreadCount returns the count', async () => {
    const { svc } = build([]);
    expect(await svc.unreadCount('u1')).toBe(3);
  });
});
