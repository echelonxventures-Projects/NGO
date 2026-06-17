import { LogEmailAdapter } from './log-email.adapter';

describe('LogEmailAdapter', () => {
  it('accepts the message and returns a synthetic message id', async () => {
    const a = new LogEmailAdapter();
    const res = await a.send({ to: 'donor@example.org', subject: 'Receipt', html: '<p>hi</p>' });

    expect(res.provider).toBe('log');
    expect(res.accepted).toBe(true);
    expect(res.messageId).toMatch(/^log_/);
  });

  it('handles multiple recipients', async () => {
    const a = new LogEmailAdapter();
    const res = await a.send({ to: ['a@x.org', 'b@x.org'], subject: 'Hi' });
    expect(res.accepted).toBe(true);
  });
});
