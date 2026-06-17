import { EmailChannel } from './email.channel';

describe('EmailChannel', () => {
  function channel(send: jest.Mock) {
    return new EmailChannel({ name: 'log', send } as any);
  }

  it('fails without a "to" address', async () => {
    const send = jest.fn();
    const res = await channel(send).send({ type: 't', title: 'x', body: 'y' });
    expect(res.status).toBe('failed');
    expect(send).not.toHaveBeenCalled();
  });

  it('delivers via the EmailPort and returns the message id', async () => {
    const send = jest.fn().mockResolvedValue({ provider: 'log', messageId: 'm1', accepted: true });
    const res = await channel(send).send({
      type: 't',
      title: 'Subject',
      body: 'plain',
      html: '<p>rich</p>',
      to: 'u@x.org',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'u@x.org', subject: 'Subject', html: '<p>rich</p>', text: 'plain' }),
    );
    expect(res).toMatchObject({ channel: 'EMAIL', status: 'sent', ref: 'm1' });
  });

  it('maps a non-accepted send to failed', async () => {
    const send = jest.fn().mockResolvedValue({ provider: 'log', messageId: 'm2', accepted: false });
    const res = await channel(send).send({ type: 't', title: 'x', body: 'y', to: 'u@x.org' });
    expect(res.status).toBe('failed');
  });

  it('catches transport errors and returns failed', async () => {
    const send = jest.fn().mockRejectedValue(new Error('smtp down'));
    const res = await channel(send).send({ type: 't', title: 'x', body: 'y', to: 'u@x.org' });
    expect(res).toMatchObject({ status: 'failed', error: 'smtp down' });
  });
});
