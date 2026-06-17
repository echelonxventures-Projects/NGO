import { InAppChannel } from './in-app.channel';

describe('InAppChannel', () => {
  it('fails without a recipient user', async () => {
    const res = await new InAppChannel().send({ type: 't', title: 'x', body: 'y' });
    expect(res.status).toBe('failed');
  });

  it('succeeds with a userId (persistence handled by the service)', async () => {
    const res = await new InAppChannel().send({ type: 't', title: 'x', body: 'y', userId: 'u1' });
    expect(res).toEqual({ channel: 'IN_APP', status: 'sent' });
  });
});
