import { WebhookChannel } from './webhook.channel';

describe('WebhookChannel', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });

  it('fails without a target URL', async () => {
    const res = await new WebhookChannel().send({ type: 't', title: 'x', body: 'y' });
    expect(res.status).toBe('failed');
  });

  it('POSTs JSON and reports success on a 2xx response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    const res = await new WebhookChannel().send({
      type: 'evt',
      title: 'x',
      body: 'y',
      to: 'https://hooks.example.org/in',
      data: { a: 1 },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.example.org/in',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res).toMatchObject({ status: 'sent', ref: '200' });
  });

  it('reports failure on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;
    const res = await new WebhookChannel().send({
      type: 'evt',
      title: 'x',
      body: 'y',
      to: 'https://hooks.example.org/in',
    });
    expect(res).toMatchObject({ status: 'failed', error: 'HTTP 500' });
  });

  it('reports failure when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;
    const res = await new WebhookChannel().send({
      type: 'evt',
      title: 'x',
      body: 'y',
      to: 'https://hooks.example.org/in',
    });
    expect(res).toMatchObject({ status: 'failed', error: 'network down' });
  });
});
