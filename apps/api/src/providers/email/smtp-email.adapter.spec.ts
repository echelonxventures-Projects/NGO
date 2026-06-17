import { SmtpEmailAdapter } from './smtp-email.adapter';

const sendMail = jest.fn();
const createTransport = jest.fn(() => ({ sendMail }));

// Intercept the adapter's lazy `import('nodemailer')`.
jest.mock('nodemailer', () => ({ createTransport }), { virtual: true });

describe('SmtpEmailAdapter', () => {
  function adapter() {
    const config = {
      get: (key: string) =>
        ({
          'email.smtp': { host: 'smtp.test', port: 587, secure: false, user: 'u', pass: 'p' },
          'email.from': 'no-reply@platform.local',
        } as Record<string, unknown>)[key],
    } as any;
    return new SmtpEmailAdapter(config);
  }

  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
  });

  it('sends via the SMTP transporter and reports acceptance', async () => {
    sendMail.mockResolvedValue({ messageId: 'abc123', accepted: ['donor@example.org'] });
    const a = adapter();

    const res = await a.send({ to: 'donor@example.org', subject: 'Receipt', html: '<p>hi</p>' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.test', port: 587, secure: false }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'no-reply@platform.local', to: 'donor@example.org' }),
    );
    expect(res).toEqual({ provider: 'smtp', messageId: 'abc123', accepted: true });
  });

  it('uses an explicit from override when provided', async () => {
    sendMail.mockResolvedValue({ messageId: 'm2', accepted: ['x@y.org'] });
    const a = adapter();
    await a.send({ to: 'x@y.org', subject: 'Hi', from: 'custom@org.test' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'custom@org.test' }),
    );
  });

  it('reuses a single transporter across sends', async () => {
    sendMail.mockResolvedValue({ messageId: 'm', accepted: ['a@b.org'] });
    const a = adapter();
    await a.send({ to: 'a@b.org', subject: '1' });
    await a.send({ to: 'a@b.org', subject: '2' });
    expect(createTransport).toHaveBeenCalledTimes(1);
  });
});
